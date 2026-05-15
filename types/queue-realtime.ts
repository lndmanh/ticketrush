import type { DateLike } from '~~/types/events'
import type { QueueState } from '~~/types/ticketing'
import { QueueStatus } from '#shared/commonEnums'

export type QueueResyncReason = 'joined' | 'admitted' | 'expired' | 'left' | 'completed' | 'settings-changed' | 'server-recovery'

export interface QueueConnectedMessage {
  type: 'queue-connected'
  sessionPublicId: string
}

export interface QueueStateMessage {
  type: 'queue-state'
  sessionPublicId: string
  state: QueueState | null
}

export interface QueueResyncRequiredMessage {
  type: 'queue-resync-required'
  sessionPublicId: string
  reason: QueueResyncReason
}

export type QueueRealtimeMessage = QueueConnectedMessage | QueueStateMessage | QueueResyncRequiredMessage

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isQueueStatus(value: unknown): value is QueueStatus {
  return value === QueueStatus.Waiting || value === QueueStatus.Admitted || value === QueueStatus.Expired || value === QueueStatus.Completed
}

function isValidExpiresAt(value: unknown): value is DateLike {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime())
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return false
  }

  return !Number.isNaN(new Date(value).getTime())
}

function parseQueueStateEntry(value: unknown): NonNullable<QueueState['entry']> | null {
  if (!isRecord(value)) {
    return null
  }

  if (Object.prototype.hasOwnProperty.call(value, 'passToken')) {
    return null
  }

  if (!isQueueStatus(value.status)) {
    return null
  }

  if (value.expiresAt !== undefined && value.expiresAt !== null && !isValidExpiresAt(value.expiresAt)) {
    return null
  }

  return {
    status: value.status,
    expiresAt: value.expiresAt,
  }
}

function parseQueueState(value: unknown): QueueState | null {
  if (!isRecord(value)) {
    return null
  }

  if (!Object.prototype.hasOwnProperty.call(value, 'entry') || value.entry === undefined) {
    return null
  }

  let entry: QueueState['entry'] = null
  if (value.entry !== null) {
    const parsedEntry = parseQueueStateEntry(value.entry)
    if (!parsedEntry) {
      return null
    }

    entry = parsedEntry
  }

  if (!Number.isSafeInteger(value.position)
    || value.position < 0
    || !Number.isSafeInteger(value.waitingCount)
    || value.waitingCount < 0
    || !Number.isSafeInteger(value.admittedCount)
    || value.admittedCount < 0
    || !Number.isSafeInteger(value.queueBatchSize)
    || value.queueBatchSize < 0
    || !Number.isSafeInteger(value.queueWindowSeconds)
    || value.queueWindowSeconds < 0
    || !Number.isSafeInteger(value.estimatedWaitSeconds)
    || value.estimatedWaitSeconds < 0
    || (typeof value.redirectPath !== 'string' && value.redirectPath !== null)) {
    return null
  }

  return {
    entry,
    position: value.position,
    waitingCount: value.waitingCount,
    admittedCount: value.admittedCount,
    queueBatchSize: value.queueBatchSize,
    queueWindowSeconds: value.queueWindowSeconds,
    estimatedWaitSeconds: value.estimatedWaitSeconds,
    redirectPath: value.redirectPath,
  }
}

function isQueueResyncReason(value: unknown): value is QueueResyncReason {
  return value === 'joined'
    || value === 'admitted'
    || value === 'expired'
    || value === 'left'
    || value === 'completed'
    || value === 'settings-changed'
    || value === 'server-recovery'
}

export function parseQueueRealtimeMessage(value: string): QueueRealtimeMessage | null {
  try {
    const parsed: unknown = JSON.parse(value)

    if (!isRecord(parsed) || typeof parsed.sessionPublicId !== 'string' || parsed.sessionPublicId.trim() === '') {
      return null
    }

    if (parsed.type === 'queue-connected') {
      return {
        type: 'queue-connected',
        sessionPublicId: parsed.sessionPublicId,
      }
    }

    if (parsed.type === 'queue-state') {
      const state = parsed.state === null ? null : parseQueueState(parsed.state)
      if (!state) {
        if (parsed.state !== null) {
          return null
        }
      }

      return {
        type: 'queue-state',
        sessionPublicId: parsed.sessionPublicId,
        state,
      }
    }

    if (parsed.type === 'queue-resync-required') {
      if (!isQueueResyncReason(parsed.reason)) {
        return null
      }

      return {
        type: 'queue-resync-required',
        sessionPublicId: parsed.sessionPublicId,
        reason: parsed.reason,
      }
    }

    return null
  }
  catch {
    return null
  }
}

export function serializeQueueRealtimeMessage(message: QueueRealtimeMessage): string {
  return JSON.stringify(message)
}
