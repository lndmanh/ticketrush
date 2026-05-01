import { and, asc, eq, inArray, like, or } from 'drizzle-orm'
import type { Event, EventSession } from '#shared/db'
import type { CreateEventInput, EventSessionDraftInput, UpdateEventInput } from '#shared/schemas/ticketingSchema'
import { IDatabaseService } from '~~/types/db/database-service'
import { createPublicEventId } from '~~/server/utils/ticketing/ids'
import eventSessionService from '~~/server/utils/database/event-session'

type EventDetail = {
  event: Event
  sessions: Array<EventSession & {
    ticketTypes: typeof tables.ticketTypes.$inferSelect[]
    seats: typeof tables.eventSeats.$inferSelect[]
  }>
}

type Database = ReturnType<typeof useDB>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

class EventService extends IDatabaseService<Event> {
  private static instance: EventService

  private get db() {
    return useDB()
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService()
    }

    return EventService.instance
  }

  async getById(id: number) {
    return this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, id))
      .get()
  }

  async getBySlug(slug: string) {
    return this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.slug, slug))
      .get()
  }

  async getList() {
    return this.db
      .select()
      .from(tables.events)
      .all()
  }

  async getPublishedList() {
    return this.db
      .select()
      .from(tables.events)
      .where(inArray(tables.events.status, ['published', 'on_sale', 'sold_out', 'ended']))
      .all()
  }

  async getDetailBySlug(slug: string): Promise<EventDetail | undefined> {
    const event = await this.getBySlug(slug)
    if (!event) {
      return undefined
    }

    const sessions = await eventSessionService.listByEventId(event.id)
    const sessionsWithDetails = await Promise.all(sessions.map(async (session) => ({
      ...session,
      ...(await eventSessionService.getSeatMap(session.id)),
    })))

    return {
      event,
      sessions: sessionsWithDetails,
    }
  }

  async create(data: CreateEventInput) {
    const now = new Date()
    const primarySession = data.sessions[0]
    if (!primarySession) {
      throw new Error('At least one event session is required.')
    }

    const event = await this.db.transaction(async (tx) => {
      const createdEvent = await tx
        .insert(tables.events)
        .values({
          publicId: createPublicEventId(),
          slug: data.slug,
          title: data.title,
          subtitle: data.subtitle ?? null,
          description: data.description,
          status: 'draft',
          venueId: data.venueId,
          coverImage: data.coverImage || null,
          startsAt: primarySession.startsAt,
          endsAt: primarySession.endsAt ?? null,
          salesStartAt: primarySession.salesStartAt,
          salesEndAt: primarySession.salesEndAt,
          queueEnabled: primarySession.queueEnabled,
          queueBatchSize: primarySession.queueBatchSize,
          queueWindowSeconds: primarySession.queueWindowSeconds,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get()

      if (!createdEvent) {
        throw new Error('Failed to create event')
      }

      for (const session of data.sessions) {
        await eventSessionService.createForEventInTransaction(tx, createdEvent.id, data.venueId, session, now)
      }

      return createdEvent
    })

    return event
  }

  async update(data: UpdateEventInput) {
    const now = new Date()
    const primarySession = data.sessions[0]
    if (!primarySession) {
      throw new Error('At least one event session is required.')
    }

    const event = await this.db.transaction(async (tx) => {
      const existingEvent = await tx.select().from(tables.events).where(eq(tables.events.id, data.id)).get()
      if (!existingEvent) {
        throw new Error('Event not found')
      }

      const updatedEvent = await tx
        .update(tables.events)
        .set({
          slug: data.slug,
          title: data.title,
          subtitle: data.subtitle ?? null,
          description: data.description,
          venueId: data.venueId,
          coverImage: data.coverImage || null,
          startsAt: primarySession.startsAt,
          endsAt: primarySession.endsAt ?? null,
          salesStartAt: primarySession.salesStartAt,
          salesEndAt: primarySession.salesEndAt,
          queueEnabled: primarySession.queueEnabled,
          queueBatchSize: primarySession.queueBatchSize,
          queueWindowSeconds: primarySession.queueWindowSeconds,
          updatedAt: now,
        })
        .where(eq(tables.events.id, data.id))
        .returning()
        .get()

      if (!updatedEvent) {
        throw new Error('Event not found')
      }

      for (const session of data.sessions) {
        await eventSessionService.updateForEventInTransaction(tx, data.id, data.venueId, session, now)
      }

      return updatedEvent
    })

    return event
  }

  private async updateParentSummaryFieldsInTransaction(tx: Transaction, eventId: number, now: Date) {
    const sessions = await tx
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .orderBy(asc(tables.eventSessions.startsAt))
      .all()

    const primarySession = sessions[0]
    if (!primarySession) {
      throw new Error('At least one event session is required.')
    }

    const updatedEvent = await tx
      .update(tables.events)
      .set({
        startsAt: primarySession.startsAt,
        endsAt: primarySession.endsAt ?? null,
        salesStartAt: primarySession.salesStartAt,
        salesEndAt: primarySession.salesEndAt,
        queueEnabled: primarySession.queueEnabled,
        queueBatchSize: primarySession.queueBatchSize,
        queueWindowSeconds: primarySession.queueWindowSeconds,
        updatedAt: now,
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()

    if (!updatedEvent) {
      throw new Error('Event not found')
    }

    return updatedEvent
  }

  async createSession(eventId: number, input: EventSessionDraftInput) {
    const now = new Date()
    return this.db.transaction(async (tx) => {
      const parent = await tx.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
      if (!parent) {
        throw new Error('Event not found')
      }

      const created = await eventSessionService.createForEventInTransaction(tx, eventId, parent.venueId, input, now)
      await this.updateParentSummaryFieldsInTransaction(tx, eventId, now)
      return created
    })
  }

  async updateSession(eventId: number, sessionId: number, input: EventSessionDraftInput) {
    const now = new Date()
    return this.db.transaction(async (tx) => {
      const parent = await tx.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
      if (!parent) {
        throw new Error('Event not found')
      }

      const updated = await eventSessionService.updateForEventInTransaction(tx, eventId, parent.venueId, { ...input, id: sessionId }, now)
      await this.updateParentSummaryFieldsInTransaction(tx, eventId, now)
      return updated
    })
  }

  async publish(eventId: number) {
    const now = new Date()

    return this.db.transaction(async (tx) => {
      const event = await tx.select().from(tables.events).where(eq(tables.events.id, eventId)).get()
      if (!event) {
        throw new Error('Event not found')
      }

      const sessions = await tx
        .select()
        .from(tables.eventSessions)
        .where(eq(tables.eventSessions.eventId, eventId))
        .orderBy(asc(tables.eventSessions.startsAt))
        .all()
      if (sessions.length === 0) {
        throw new Error('At least one event session is required before publishing.')
      }

      for (const session of sessions) {
        await eventSessionService.assertCanPublishSessionInTransaction(tx, session.id)
      }

      for (const session of sessions) {
        await eventSessionService.publishSessionInTransaction(tx, session.id, now)
      }

      const publishedEvent = await tx
        .update(tables.events)
        .set({
          status: 'published',
          publishedAt: event.publishedAt ?? now,
          updatedAt: now,
        })
        .where(eq(tables.events.id, eventId))
        .returning()
        .get()

      if (!publishedEvent) {
        throw new Error('Failed to publish event')
      }

      return publishedEvent
    })
  }

  async delete(id: number) {
    await this.db
      .delete(tables.events)
      .where(eq(tables.events.id, id))
  }

  async bulkDelete(ids: number[]) {
    if (ids.length === 0) {
      return
    }

    await this.db
      .delete(tables.events)
      .where(inArray(tables.events.id, ids))
  }

  async setStatus(eventId: number, status: typeof tables.events.$inferSelect['status']) {
    return this.db
      .update(tables.events)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()
  }

  async unpublish(eventId: number) {
    return this.db
      .update(tables.events)
      .set({
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tables.events.id, eventId))
      .returning()
      .get()
  }

  async getSeatMap(eventId: number) {
    const defaultSession = await eventSessionService.getDefaultSessionForEvent(eventId)
    if (!defaultSession) {
      return {
        seats: [],
        ticketTypes: [],
      }
    }

    const { seats, ticketTypes } = await eventSessionService.getSeatMap(defaultSession.id)

    return {
      seats,
      ticketTypes,
    }
  }

  async getEventCardList() {
    const events = await this.db
      .select()
      .from(tables.events)
      .where(inArray(tables.events.status, ['published', 'on_sale', 'sold_out', 'ended']))
      .all()

    const venueIds = events.map(event => event.venueId)
    const venues = venueIds.length > 0
      ? await this.db
          .select()
          .from(tables.venues)
          .where(inArray(tables.venues.id, venueIds))
          .all()
      : []

    const venueById = new Map(venues.map(venue => [venue.id, venue]))
    const eventIds = events.map(event => event.id)
    const sessions = eventIds.length > 0
      ? await this.db
          .select()
          .from(tables.eventSessions)
          .where(inArray(tables.eventSessions.eventId, eventIds))
          .all()
      : []
    const sessionsByEventId = new Map<number, typeof sessions>()

    for (const session of sessions) {
      const currentSessions = sessionsByEventId.get(session.eventId) ?? []
      currentSessions.push(session)
      sessionsByEventId.set(session.eventId, currentSessions)
    }

    return events.map(event => ({
      ...event,
      venue: venueById.get(event.venueId) ?? null,
      sessions: (sessionsByEventId.get(event.id) ?? []).sort((first, second) => {
        return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
      }),
    }))
  }

  async searchEventCardList(searchTerm: string, limit: number) {
    const normalizedSearchTerm = searchTerm.trim()
    if (!normalizedSearchTerm) {
      return []
    }

    const searchPattern = `%${normalizedSearchTerm}%`
    const publishedStatuses: Event['status'][] = ['published', 'on_sale', 'sold_out', 'ended']

    const events = await this.db
      .select()
      .from(tables.events)
      .where(and(
        inArray(tables.events.status, publishedStatuses),
        or(
          like(tables.events.title, searchPattern),
          like(tables.events.subtitle, searchPattern),
          like(tables.events.description, searchPattern),
          like(tables.events.slug, searchPattern),
        ),
      ))
      .limit(Math.max(limit, 1))
      .all()

    const venueIds = events.map(event => event.venueId)
    const venues = venueIds.length > 0
      ? await this.db
          .select()
          .from(tables.venues)
          .where(inArray(tables.venues.id, venueIds))
          .all()
      : []

    const venueById = new Map(venues.map(venue => [venue.id, venue]))
    const eventIds = events.map(event => event.id)
    const sessions = eventIds.length > 0
      ? await this.db
          .select()
          .from(tables.eventSessions)
          .where(inArray(tables.eventSessions.eventId, eventIds))
          .all()
      : []
    const sessionsByEventId = new Map<number, typeof sessions>()

    for (const session of sessions) {
      const currentSessions = sessionsByEventId.get(session.eventId) ?? []
      currentSessions.push(session)
      sessionsByEventId.set(session.eventId, currentSessions)
    }

    return events.map(event => ({
      ...event,
      venue: venueById.get(event.venueId) ?? null,
      sessions: (sessionsByEventId.get(event.id) ?? []).sort((first, second) => {
        return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
      }),
    }))
  }
}

export default EventService.getInstance()
