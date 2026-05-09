import { eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import type { SeatMapStatus } from '~~/types/seatmap'
import type { SeatStatusDeltaChange, SeatmapRealtimeMessage } from '~~/types/seatmap-realtime'

export interface SeatmapRealtimeNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

export interface SeatmapRealtimeEnv {
  SEATMAP_REALTIME_ROOM?: SeatmapRealtimeNamespace
}

export interface SeatmapRealtimeTarget {
  eventSessionId: number
  sessionPublicId: string
}

type CloudflareRuntimeEnv = {
  SEATMAP_REALTIME_ROOM?: SeatmapRealtimeNamespace
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSeatmapRealtimeNamespace(value: unknown): value is SeatmapRealtimeNamespace {
  return isRecord(value)
    && typeof value.idFromName === 'function'
    && typeof value.get === 'function'
}

function getSeatmapRealtimeRoomNamespace(event: H3Event): SeatmapRealtimeNamespace | undefined {
  if (!isRecord(event.req)) {
    return undefined
  }

  const runtime = event.req.runtime
  if (!isRecord(runtime)) {
    return undefined
  }

  const cloudflare = runtime.cloudflare
  if (!isRecord(cloudflare)) {
    return undefined
  }

  const env = cloudflare.env
  if (!isRecord(env) || !isSeatmapRealtimeNamespace(env.SEATMAP_REALTIME_ROOM)) {
    return undefined
  }

  return env.SEATMAP_REALTIME_ROOM
}

export function getSeatmapRealtimeEnv(event: H3Event): SeatmapRealtimeEnv {
  return {
    SEATMAP_REALTIME_ROOM: getSeatmapRealtimeRoomNamespace(event),
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

async function broadcastSeatmapMessage(
  namespace: SeatmapRealtimeNamespace,
  target: SeatmapRealtimeTarget,
  message: SeatmapRealtimeMessage,
) {
  try {
    const id = namespace.idFromName(target.sessionPublicId)
    const stub = namespace.get(id)

    const response = await stub.fetch('https://seatmap-realtime-room.local/broadcast', {
      method: 'POST',
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error('Seatmap realtime broadcast returned a non-ok response.', { sessionPublicId: target.sessionPublicId, type: message.type, status: response.status })
    }
  }
  catch (error) {
    console.error('Seatmap realtime broadcast failed.', { sessionPublicId: target.sessionPublicId, type: message.type, error })
  }
}

async function broadcastSeatmapResyncRequiredWithVersion(
  namespace: SeatmapRealtimeNamespace,
  target: SeatmapRealtimeTarget,
  version: number,
  reason: 'layout-rebuilt' | 'server-recovery',
) {
  await broadcastSeatmapMessage(namespace, target, {
    type: 'seatmap-resync-required',
    sessionPublicId: target.sessionPublicId,
    version,
    reason,
  })
}

export async function broadcastSeatStatusDelta(
  namespace: SeatmapRealtimeNamespace | undefined,
  target: SeatmapRealtimeTarget,
  changes: SeatStatusDeltaChange[],
) {
  if (changes.length === 0) {
    return
  }

  const version = await bumpSeatmapVersion(target.eventSessionId)
  if (!namespace) {
    return
  }

  await broadcastSeatmapMessage(namespace, target, {
    type: 'seat-status-delta',
    sessionPublicId: target.sessionPublicId,
    version,
    changes,
  })
}

export async function broadcastSeatmapResyncRequired(
  namespace: SeatmapRealtimeNamespace | undefined,
  target: SeatmapRealtimeTarget,
  reason: 'layout-rebuilt' | 'server-recovery',
) {
  const version = await bumpSeatmapVersion(target.eventSessionId)
  if (!namespace) {
    return
  }

  await broadcastSeatmapResyncRequiredWithVersion(namespace, target, version, reason)
}

export async function broadcastSeatmapResyncRequiredWithKnownVersion(
  namespace: SeatmapRealtimeNamespace | undefined,
  target: SeatmapRealtimeTarget,
  version: number,
  reason: 'layout-rebuilt' | 'server-recovery',
) {
  if (!namespace) {
    return
  }

  await broadcastSeatmapResyncRequiredWithVersion(namespace, target, version, reason)
}

export function createSeatStatusChanges(seatIds: number[], status: SeatMapStatus): SeatStatusDeltaChange[] {
  return seatIds.map(seatId => ({
    seatId,
    status,
  }))
}
