import { and, asc, eq } from 'drizzle-orm'
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

    const existing = await this.db
      .select()
      .from(tables.queueEntries)
      .where(eq(tables.queueEntries.eventSessionId, eventSessionId))
      .all()

    const current = existing.find(entry => entry.customerKey === customerKey)
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

  async getStatus(eventSessionId: number, customerKey: string): Promise<QueueState | null> {
    await this.expireAdmittedEntries(eventSessionId)

    const session = await this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.id, eventSessionId))
      .get()

    if (!session) {
      return null
    }

    const entries = await this.db
      .select()
      .from(tables.queueEntries)
      .where(eq(tables.queueEntries.eventSessionId, eventSessionId))
      .orderBy(asc(tables.queueEntries.id))
      .all()

    const current = entries.find(entry => entry.customerKey === customerKey)
    if (!current) {
      return null
    }

    const now = new Date()

    const position = current.status === QueueStatus.Waiting
      ? entries.filter(entry => entry.status === QueueStatus.Waiting && entry.id <= current.id).length
      : 0

    const redirectPath = await this.getEntryRedirectPath(session, current)

    const settings = await waitingRoomSettingsService.getSettings()
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
      waitingCount: entries.filter(entry => entry.status === QueueStatus.Waiting).length,
      admittedCount: entries.filter(entry => isActiveQueueAdmission(entry, now)).length,
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

    const waitingEntries = await this.db
      .select()
      .from(tables.queueEntries)
      .where(eq(tables.queueEntries.eventSessionId, eventSessionId))
      .orderBy(asc(tables.queueEntries.id))
      .all()

    const settings = await waitingRoomSettingsService.getSettings()

    const candidates = waitingEntries
      .filter(entry => entry.status === QueueStatus.Waiting)
      .slice(0, settings.queueBatchSize)

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
      .where(eq(tables.queueEntries.eventSessionId, eventSessionId))
      .all()
      .then(entries => entries.find(candidate => candidate.customerKey === customerKey))

    if (!entry || entry.passToken !== passToken) {
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

    const [queueEntries, activeHolds] = await Promise.all([
      this.db.select().from(tables.queueEntries).where(eq(tables.queueEntries.eventSessionId, eventSessionId)).all(),
      this.db.select().from(tables.seatHolds).where(eq(tables.seatHolds.eventSessionId, eventSessionId)).all(),
    ])

    const now = new Date()

    const current = queueEntries.find(entry => entry.customerKey === customerKey)
    if (current && isActiveQueueAdmission(current, now)) {
      return false
    }

    const activeQueueCount = queueEntries.filter(entry => isActiveQueueAdmission(entry, now)).length
    const activeHoldCount = activeHolds.filter(hold => hold.status === HoldStatus.Active).length

    const settings = await waitingRoomSettingsService.getSettings()
    return activeQueueCount + activeHoldCount >= settings.queueActivationThreshold
  }

  async expireAdmittedEntries(eventSessionId?: number) {
    const query = this.db
      .select()
      .from(tables.queueEntries)

    const entries = eventSessionId
      ? await query.where(eq(tables.queueEntries.eventSessionId, eventSessionId)).all()
      : await query.all()

    const now = new Date()
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
