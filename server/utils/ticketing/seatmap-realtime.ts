import { eq, sql } from 'drizzle-orm'
import type { SeatMapStatus } from '~~/types/seatmap'
import type { SeatStatusDeltaChange } from '~~/types/seatmap-realtime'

export type SeatmapRealtimeNamespace = never

export interface SeatmapRealtimeEnv {
  SEATMAP_REALTIME_ROOM?: SeatmapRealtimeNamespace
}

export interface SeatmapRealtimeTarget {
  eventSessionId: number
  sessionPublicId: string
}

export function getSeatmapRealtimeEnv(_event?: unknown): SeatmapRealtimeEnv {
  return {
    SEATMAP_REALTIME_ROOM: undefined,
  }
}

export async function bumpSeatmapVersion(eventSessionId: number) {
  const db = useDB()
  const now = new Date()
  const updatedSession = await db
    .update(tables.eventSessions)
    .set({
      seatmapVersion: sql`${tables.eventSessions.seatmapVersion} + 1`,
      updatedAt: now,
    })
    .where(eq(tables.eventSessions.id, eventSessionId))
    .returning({ seatmapVersion: tables.eventSessions.seatmapVersion })
    .get()

  if (!updatedSession) {
    throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
  }

  return updatedSession.seatmapVersion
}

export async function broadcastSeatStatusDelta(
  _namespace: SeatmapRealtimeNamespace | undefined,
  target: SeatmapRealtimeTarget,
  changes: SeatStatusDeltaChange[],
) {
  if (changes.length === 0) {
    return
  }

  await bumpSeatmapVersion(target.eventSessionId)
}

export async function broadcastSeatmapResyncRequired(
  _namespace: SeatmapRealtimeNamespace | undefined,
  target: SeatmapRealtimeTarget,
  _reason: 'layout-rebuilt' | 'server-recovery',
) {
  await bumpSeatmapVersion(target.eventSessionId)
}

export async function broadcastSeatmapResyncRequiredWithKnownVersion(
  _namespace: SeatmapRealtimeNamespace | undefined,
  _target: SeatmapRealtimeTarget,
  _version: number,
  _reason: 'layout-rebuilt' | 'server-recovery',
) {
}

export function createSeatStatusChanges(seatIds: number[], status: SeatMapStatus): SeatStatusDeltaChange[] {
  return seatIds.map(seatId => ({
    seatId,
    status,
  }))
}
