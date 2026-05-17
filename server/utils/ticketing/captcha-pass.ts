import { and, eq } from 'drizzle-orm'
import { apiError } from '~~/server/utils/apiResponse'

export const BOOKING_SESSION_TTL_SECONDS = 10 * 60

const BOOKING_SESSION_KEY_PREFIX = 'booking-session'

function getBookingSessionKey(eventSessionId: number, customerKey: string) {
  return `${BOOKING_SESSION_KEY_PREFIX}:${eventSessionId}:${customerKey}`
}

export async function createBookingSession(eventSessionId: number, customerKey: string) {
  const createdAt = new Date().toISOString()

  await useKV().set(getBookingSessionKey(eventSessionId, customerKey), createdAt, {
    ttl: BOOKING_SESSION_TTL_SECONDS,
  })

  return { eventSessionId, customerKey, createdAt }
}

export async function hasBookingSession(eventSessionId: number, customerKey: string) {
  const value = await useKV().get<string>(getBookingSessionKey(eventSessionId, customerKey))
  return value !== null
}

export function createCaptchaRequiredError() {
  return apiError({
    status: 403,
    statusText: 'Forbidden',
    code: 'CAPTCHA_REQUIRED',
    message: 'Complete the captcha check before booking this session.',
  })
}

export async function requireBookingSession(eventSessionId: number, customerKey: string) {
  if (await hasBookingSession(eventSessionId, customerKey)) {
    return
  }

  throw createCaptchaRequiredError()
}

async function hasQueueEntry(eventSessionId: number, customerKey: string) {
  const entry = await useDB()
    .select()
    .from(tables.queueEntries)
    .where(and(
      eq(tables.queueEntries.eventSessionId, eventSessionId),
      eq(tables.queueEntries.customerKey, customerKey),
    ))
    .get()

  return Boolean(entry)
}

export async function hasBookingSessionOrQueueEntry(eventSessionId: number, customerKey: string) {
  if (await hasBookingSession(eventSessionId, customerKey)) {
    return true
  }

  return hasQueueEntry(eventSessionId, customerKey)
}

export async function requireBookingSessionOrQueueEntry(eventSessionId: number, customerKey: string) {
  if (await hasBookingSessionOrQueueEntry(eventSessionId, customerKey)) {
    return
  }

  throw createCaptchaRequiredError()
}
