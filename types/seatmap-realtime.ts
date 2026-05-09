import type { SeatMapStatus } from '~~/types/seatmap'

export interface SeatStatusDeltaChange {
  seatId: number
  status: SeatMapStatus
}

export interface SeatStatusDeltaMessage {
  type: 'seat-status-delta'
  sessionPublicId: string
  version: number
  changes: SeatStatusDeltaChange[]
}

export interface SeatmapResyncRequiredMessage {
  type: 'seatmap-resync-required'
  sessionPublicId: string
  version: number
  reason: 'missed-version' | 'layout-rebuilt' | 'server-recovery'
}

export interface SeatmapConnectedMessage {
  type: 'seatmap-connected'
  sessionPublicId: string
  version: number
}

export type SeatmapRealtimeMessage =
  | SeatStatusDeltaMessage
  | SeatmapResyncRequiredMessage
  | SeatmapConnectedMessage

export function isSeatMapStatus(value: unknown): value is SeatMapStatus {
  return value === 'available' || value === 'locked' || value === 'sold' || value === 'unavailable'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDeltaChange(value: unknown): value is SeatStatusDeltaChange {
  if (!isRecord(value)) {
    return false
  }

  return Number.isSafeInteger(value.seatId) && value.seatId > 0 && isSeatMapStatus(value.status)
}

export function parseSeatmapRealtimeMessage(value: string): SeatmapRealtimeMessage | null {
  try {
    const parsed: unknown = JSON.parse(value)

    if (!isRecord(parsed)) {
      return null
    }

    if (typeof parsed.sessionPublicId !== 'string' || parsed.sessionPublicId.trim() === '' || typeof parsed.version !== 'number' || !Number.isSafeInteger(parsed.version) || parsed.version < 0) {
      return null
    }

    if (parsed.type === 'seatmap-connected') {
      return {
        type: 'seatmap-connected',
        sessionPublicId: parsed.sessionPublicId,
        version: parsed.version,
      }
    }

    if (parsed.type === 'seatmap-resync-required') {
      if (parsed.reason !== 'missed-version' && parsed.reason !== 'layout-rebuilt' && parsed.reason !== 'server-recovery') {
        return null
      }

      return {
        type: 'seatmap-resync-required',
        sessionPublicId: parsed.sessionPublicId,
        version: parsed.version,
        reason: parsed.reason,
      }
    }

    if (parsed.type === 'seat-status-delta') {
      if (!Array.isArray(parsed.changes) || !parsed.changes.every(isDeltaChange)) {
        return null
      }

      return {
        type: 'seat-status-delta',
        sessionPublicId: parsed.sessionPublicId,
        version: parsed.version,
        changes: parsed.changes,
      }
    }

    return null
  }
  catch {
    return null
  }
}

export function serializeSeatmapRealtimeMessage(message: SeatmapRealtimeMessage) {
  return JSON.stringify(message)
}
