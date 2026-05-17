import { and, asc, eq, gt, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import { createQueuePassToken } from '~~/server/utils/ticketing/ids'
import { isActiveQueueAdmission, shouldExpireQueueAdmission } from '~~/server/utils/ticketing/queue-admission-state'
import waitingRoomSettingsService from '~~/server/utils/ticketing/waiting-room-settings'
import { HoldStatus, QueueStatus } from '#shared/commonEnums'
import type { QueueState } from '~~/types/ticketing'

function buildQueuePassKey(eventSessionId: number, passToken: string) {
  return `queue-pass:${eventSessionId}:${passToken}`
}

class QueueService {
  private get db() {
    return useDB()
  }

  private get kv() {
    return useKV()
  }

  async joinQueue(eventSessionId: number, customerKey: string, userId?: number) {
    const session = await this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.id, eventSessionId))
      .get()

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
    }

    const current = await this.db
      .select()
      .from(tables.queueEntries)
      .where(and(
        eq(tables.queueEntries.eventSessionId, eventSessionId),
        eq(tables.queueEntries.customerKey, customerKey),
      ))
      .get()

    if (current) {
      if (current.status === QueueStatus.Expired || current.status === QueueStatus.Completed) {
        await this.db
          .update(tables.queueEntries)
          .set({
            status: QueueStatus.Waiting,
            passToken: null,
            admittedAt: null,
            expiresAt: null,
            completedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(tables.queueEntries.id, current.id))

        return this.getStatus(eventSessionId, customerKey)
      }

      return this.getStatus(eventSessionId, customerKey)
    }

    try {
      const created = await this.db
        .insert(tables.queueEntries)
        .values({
          eventId: session.eventId,
          eventSessionId,
          userId: userId ?? null,
          customerKey,
          status: QueueStatus.Waiting,
          passToken: null,
          admittedAt: null,
          expiresAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .get()

      if (!created) {
        throw new Error('Failed to join queue')
      }
    }
    catch (error) {
      const status = await this.getStatus(eventSessionId, customerKey)
      if (status) {
        return status
      }

      throw error
    }

    return this.getStatus(eventSessionId, customerKey)
  }

  async getStatus(eventSessionId: number, customerKey: string, options: { skipExpire?: boolean } = {}): Promise<QueueState | null> {
    if (!options.skipExpire) {
      await this.expireAdmittedEntries(eventSessionId)
    }

    const [session, current] = await Promise.all([
      this.db
        .select()
        .from(tables.eventSessions)
        .where(eq(tables.eventSessions.id, eventSessionId))
        .get(),
      this.db
        .select()
        .from(tables.queueEntries)
        .where(and(
          eq(tables.queueEntries.eventSessionId, eventSessionId),
          eq(tables.queueEntries.customerKey, customerKey),
        ))
        .get(),
    ])

    if (!session) {
      return null
    }

    if (!current) {
      return null
    }

    const now = new Date()

    const [positionRow, waitingCountRow, admittedCountRow, settings] = await Promise.all([
      current.status === QueueStatus.Waiting
        ? this.db
            .select({ count: sql<number>`count(*)` })
            .from(tables.queueEntries)
            .where(and(
              eq(tables.queueEntries.eventSessionId, eventSessionId),
              eq(tables.queueEntries.status, QueueStatus.Waiting),
              lte(tables.queueEntries.id, current.id),
            ))
            .get()
        : Promise.resolve({ count: 0 }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(tables.queueEntries)
        .where(and(
          eq(tables.queueEntries.eventSessionId, eventSessionId),
          eq(tables.queueEntries.status, QueueStatus.Waiting),
        ))
        .get(),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(tables.queueEntries)
        .where(and(
          eq(tables.queueEntries.eventSessionId, eventSessionId),
          eq(tables.queueEntries.status, QueueStatus.Admitted),
          isNotNull(tables.queueEntries.passToken),
          gt(tables.queueEntries.expiresAt, now),
        ))
        .get(),
      waitingRoomSettingsService.getSettings(),
    ])

    const position = positionRow?.count ?? 0
    const waitingCount = waitingCountRow?.count ?? 0
    const admittedCount = admittedCountRow?.count ?? 0

    const redirectPath = await this.getEntryRedirectPath(session, current)

    const estimatedWaitSeconds = current.status === QueueStatus.Waiting
      ? Math.max(0, Math.ceil(position / Math.max(settings.queueBatchSize, 1)) * settings.queueWindowSeconds)
      : 0

    const entry = {
      status: current.status,
      expiresAt: current.expiresAt,
    }

    return {
      entry,
      position,
      waitingCount,
      admittedCount,
      queueBatchSize: settings.queueBatchSize,
      queueWindowSeconds: settings.queueWindowSeconds,
      estimatedWaitSeconds,
      redirectPath,
    }
  }

  private async getEntryRedirectPath(
    session: typeof tables.eventSessions.$inferSelect,
    entry: typeof tables.queueEntries.$inferSelect,
  ) {
    if (entry.status !== QueueStatus.Admitted || !entry.passToken) {
      return null
    }

    const event = await this.db
      .select({ slug: tables.events.slug })
      .from(tables.events)
      .where(eq(tables.events.id, session.eventId))
      .get()

    if (!event) {
      return null
    }

    const eventSlug = encodeURIComponent(event.slug)
    const sessionPublicId = encodeURIComponent(session.publicId)

    return `/events/${eventSlug}/sessions/${sessionPublicId}/seats`
  }

  async admitNextBatch(eventSessionId: number) {
    const session = await this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.id, eventSessionId))
      .get()

    if (!session) {
      throw new Error('Event session not found')
    }

    if (!session.queueEnabled) {
      return []
    }

    const settings = await waitingRoomSettingsService.getSettings()
    if (settings.queueBatchSize <= 0) {
      return []
    }

    const candidates = await this.db
      .select()
      .from(tables.queueEntries)
      .where(and(
        eq(tables.queueEntries.eventSessionId, eventSessionId),
        eq(tables.queueEntries.status, QueueStatus.Waiting),
      ))
      .orderBy(asc(tables.queueEntries.id))
      .limit(settings.queueBatchSize)
      .all()

    const admittedEntries: typeof tables.queueEntries.$inferSelect[] = []
    const expiresAt = new Date(Date.now() + settings.queueWindowSeconds * 1000)

    for (const candidate of candidates) {
      const passToken = createQueuePassToken()
      const updated = await this.db
        .update(tables.queueEntries)
        .set({
          status: QueueStatus.Admitted,
          passToken,
          admittedAt: new Date(),
          expiresAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(tables.queueEntries.id, candidate.id),
          eq(tables.queueEntries.status, QueueStatus.Waiting),
        ))
        .returning()
        .get()

      if (updated) {
        admittedEntries.push(updated)
        await this.kv.set(buildQueuePassKey(eventSessionId, passToken), JSON.stringify({
          customerKey: candidate.customerKey,
          eventId: candidate.eventId,
          eventSessionId,
        }), { ttl: settings.queueWindowSeconds })
      }
    }

    return admittedEntries
  }

  async validatePass(eventSessionId: number, customerKey: string, passToken: string) {
    const entry = await this.db
      .select()
      .from(tables.queueEntries)
      .where(and(
        eq(tables.queueEntries.eventSessionId, eventSessionId),
        eq(tables.queueEntries.customerKey, customerKey),
        eq(tables.queueEntries.passToken, passToken),
      ))
      .get()

    if (!entry) {
      return false
    }

    return isActiveQueueAdmission(entry, new Date())
  }

  async completeEntry(eventSessionId: number, customerKey: string) {
    return this.db
      .update(tables.queueEntries)
      .set({
        status: QueueStatus.Completed,
        passToken: null,
        admittedAt: null,
        expiresAt: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(tables.queueEntries.eventSessionId, eventSessionId),
        eq(tables.queueEntries.customerKey, customerKey),
      ))
      .returning()
      .get()
  }

  async leaveQueue(eventSessionId: number, customerKey: string) {
    const current = await this.db
      .select()
      .from(tables.queueEntries)
      .where(and(
        eq(tables.queueEntries.eventSessionId, eventSessionId),
        eq(tables.queueEntries.customerKey, customerKey),
      ))
      .get()

    if (!current) {
      return null
    }

    if (current.passToken) {
      await this.kv.del(buildQueuePassKey(eventSessionId, current.passToken))
    }

    return this.db
      .update(tables.queueEntries)
      .set({
        status: QueueStatus.Expired,
        passToken: null,
        admittedAt: null,
        expiresAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tables.queueEntries.id, current.id))
      .returning()
      .get()
  }

  async shouldQueue(eventSessionId: number, customerKey: string, passToken?: string) {
    const session = await this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.id, eventSessionId))
      .get()

    if (!session) {
      return false
    }

    if (!session.queueEnabled) {
      return false
    }

    if (passToken && await this.validatePass(eventSessionId, customerKey, passToken)) {
      return false
    }

    const now = new Date()

    const current = await this.db
      .select()
      .from(tables.queueEntries)
      .where(and(
        eq(tables.queueEntries.eventSessionId, eventSessionId),
        eq(tables.queueEntries.customerKey, customerKey),
      ))
      .get()

    if (current && isActiveQueueAdmission(current, now)) {
      return false
    }

    const [activeQueueCountRow, activeHoldCountRow, settings] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(tables.queueEntries)
        .where(and(
          eq(tables.queueEntries.eventSessionId, eventSessionId),
          eq(tables.queueEntries.status, QueueStatus.Admitted),
          isNotNull(tables.queueEntries.passToken),
          gt(tables.queueEntries.expiresAt, now),
        ))
        .get(),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(tables.seatHolds)
        .where(and(
          eq(tables.seatHolds.eventSessionId, eventSessionId),
          eq(tables.seatHolds.status, HoldStatus.Active),
        ))
        .get(),
      waitingRoomSettingsService.getSettings(),
    ])

    const activeQueueCount = activeQueueCountRow?.count ?? 0
    const activeHoldCount = activeHoldCountRow?.count ?? 0
    return activeQueueCount + activeHoldCount >= settings.queueActivationThreshold
  }

  async expireAdmittedEntries(eventSessionId?: number) {
    const query = this.db
      .select()
      .from(tables.queueEntries)

    const now = new Date()
    const entries = eventSessionId
      ? await query.where(and(
          eq(tables.queueEntries.eventSessionId, eventSessionId),
          eq(tables.queueEntries.status, QueueStatus.Admitted),
          or(
            isNull(tables.queueEntries.passToken),
            isNull(tables.queueEntries.expiresAt),
            lte(tables.queueEntries.expiresAt, now),
          ),
        )).all()
      : await query.where(and(
          eq(tables.queueEntries.status, QueueStatus.Admitted),
          or(
            isNull(tables.queueEntries.passToken),
            isNull(tables.queueEntries.expiresAt),
            lte(tables.queueEntries.expiresAt, now),
          ),
        )).all()
    const expired = entries.filter(entry => shouldExpireQueueAdmission(entry, now))

    for (const entry of expired) {
      if (entry.passToken && entry.eventSessionId) {
        await this.kv.del(buildQueuePassKey(entry.eventSessionId, entry.passToken))
      }

      await this.db
        .update(tables.queueEntries)
        .set({
          status: QueueStatus.Expired,
          passToken: null,
          admittedAt: null,
          expiresAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(tables.queueEntries.id, entry.id))
    }

    return expired.length
  }
}

export default new QueueService()
