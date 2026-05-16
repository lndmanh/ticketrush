import { QueueStatus } from '#shared/commonEnums'

export interface QueueAdmissionEntry {
  status: QueueStatus
  passToken?: string | null
  expiresAt?: Date | string | null
}

function isValidDate(value: Date | string | null | undefined): value is Date | string {
  if (!value) {
    return false
  }

  const date = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(date.getTime())
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

function hasPassToken(entry: QueueAdmissionEntry) {
  return typeof entry.passToken === 'string' && entry.passToken.trim().length > 0
}

export function isActiveQueueAdmission(entry: QueueAdmissionEntry, now: Date) {
  if (entry.status !== QueueStatus.Admitted || !hasPassToken(entry) || !isValidDate(entry.expiresAt)) {
    return false
  }

  return toDate(entry.expiresAt).getTime() > now.getTime()
}

export function shouldExpireQueueAdmission(entry: QueueAdmissionEntry, now: Date) {
  if (entry.status !== QueueStatus.Admitted) {
    return false
  }

  if (!hasPassToken(entry) || !isValidDate(entry.expiresAt)) {
    return true
  }

  return toDate(entry.expiresAt).getTime() <= now.getTime()
}
