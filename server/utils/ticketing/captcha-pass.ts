import { and, eq } from 'drizzle-orm'
import { apiError } from '~~/server/utils/apiResponse'
import { isActiveQueueAdmission } from '~~/server/utils/ticketing/queue-admission-state'
import { QueueStatus } from '#shared/commonEnums'

export const CAPTCHA_PASS_TTL_SECONDS = 10 * 60

const CAPTCHA_PASS_KEY_PREFIX = 'booking-captcha-pass'

export interface CaptchaPassRecord {
  eventSessionId: number
  customerKey: string
  createdAt: string
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isFreshCaptchaPassRecord(record: CaptchaPassRecord, now: Date) {
  if (!isPositiveSafeInteger(record.eventSessionId) || !isNonBlankString(record.customerKey) || !isNonBlankString(record.createdAt)) {
    return false
  }

  const createdAt = new Date(record.createdAt)
  if (Number.isNaN(createdAt.getTime())) {
    return false
  }

  const ageMs = now.getTime() - createdAt.getTime()
  return ageMs >= 0 && ageMs < CAPTCHA_PASS_TTL_SECONDS * 1000
}

function getCaptchaPassKey(eventSessionId: number, customerKey: string) {
  return `${CAPTCHA_PASS_KEY_PREFIX}:${eventSessionId}:${customerKey}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCaptchaPassRecord(rawValue: string | null): CaptchaPassRecord | null {
  if (!rawValue) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  }
  catch {
    return null
  }

  if (!isRecord(parsed)) {
    return null
  }

  if (!isPositiveSafeInteger(parsed.eventSessionId)) {
    return null
  }

  if (!isNonBlankString(parsed.customerKey)) {
    return null
  }

  if (!isNonBlankString(parsed.createdAt)) {
    return null
  }

  return {
    eventSessionId: parsed.eventSessionId,
    customerKey: parsed.customerKey,
    createdAt: parsed.createdAt,
  }
}

export async function createCaptchaPass(eventSessionId: number, customerKey: string) {
  if (!isPositiveSafeInteger(eventSessionId) || !isNonBlankString(customerKey)) {
    throw createCaptchaRequiredError()
  }

  const record: CaptchaPassRecord = {
    eventSessionId,
    customerKey,
    createdAt: new Date().toISOString(),
  }

  await useKV().set(getCaptchaPassKey(eventSessionId, customerKey), JSON.stringify(record), {
    ttl: CAPTCHA_PASS_TTL_SECONDS,
  })

  return record
}

export async function hasCaptchaPass(eventSessionId: number, customerKey: string) {
  const rawValue = await useKV().get<string>(getCaptchaPassKey(eventSessionId, customerKey))
  const record = parseCaptchaPassRecord(rawValue)

  return record !== null
    && record.eventSessionId === eventSessionId
    && record.customerKey === customerKey
    && isFreshCaptchaPassRecord(record, new Date())
}

async function getQueueEntry(eventSessionId: number, customerKey: string) {
  return useDB()
    .select()
    .from(tables.queueEntries)
    .where(and(
      eq(tables.queueEntries.eventSessionId, eventSessionId),
      eq(tables.queueEntries.customerKey, customerKey),
    ))
    .get()
}

export async function hasLiveQueueEntry(eventSessionId: number, customerKey: string) {
  const entry = await getQueueEntry(eventSessionId, customerKey)
  if (!entry) {
    return false
  }

  if (entry.status === QueueStatus.Waiting) {
    return true
  }

  return isActiveQueueAdmission(entry, new Date())
}

export async function hasQueueRecord(eventSessionId: number, customerKey: string) {
  const entry = await getQueueEntry(eventSessionId, customerKey)
  return Boolean(entry)
}

export async function hasSeatAccessProof(eventSessionId: number, customerKey: string) {
  if (await hasCaptchaPass(eventSessionId, customerKey)) {
    return true
  }

  const entry = await getQueueEntry(eventSessionId, customerKey)
  if (!entry) {
    return false
  }

  return isActiveQueueAdmission(entry, new Date())
}

export function createCaptchaRequiredError() {
  return apiError({
    status: 403,
    statusText: 'Forbidden',
    code: 'CAPTCHA_REQUIRED',
    message: 'Complete the captcha check before booking this session.',
  })
}

export async function requireCaptchaPassOrLiveQueueEntry(eventSessionId: number, customerKey: string) {
  if (await hasCaptchaPass(eventSessionId, customerKey)) {
    return
  }

  if (await hasLiveQueueEntry(eventSessionId, customerKey)) {
    return
  }

  throw createCaptchaRequiredError()
}

export async function requireCaptchaPassOrQueueRecord(eventSessionId: number, customerKey: string) {
  if (await hasCaptchaPass(eventSessionId, customerKey)) {
    return
  }

  if (await hasQueueRecord(eventSessionId, customerKey)) {
    return
  }

  throw createCaptchaRequiredError()
}

export async function requireSeatAccessProof(eventSessionId: number, customerKey: string) {
  if (await hasSeatAccessProof(eventSessionId, customerKey)) {
    return
  }

  throw createCaptchaRequiredError()
}
