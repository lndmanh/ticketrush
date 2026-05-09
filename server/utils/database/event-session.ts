import { asc, eq, inArray } from 'drizzle-orm'
import type { EventSession } from '#shared/db'
import type { EventSessionDraftInput } from '#shared/schemas/ticketingSchema'
import { IDatabaseService } from '~~/types/db/database-service'
import { createPublicEventSessionId } from '~~/server/utils/ticketing/ids'

const D1_INSERT_BATCH_SIZE = 5

type Transaction = ReturnType<typeof useDB>

type EventSessionSeatMap = {
  seats: typeof tables.eventSeats.$inferSelect[]
  ticketTypes: typeof tables.ticketTypes.$inferSelect[]
}

class EventSessionService extends IDatabaseService<typeof tables.eventSessions.$inferSelect> {
  private static instance: EventSessionService

  private get db() {
    return useDB()
  }

  public static getInstance(): EventSessionService {
    if (!EventSessionService.instance) {
      EventSessionService.instance = new EventSessionService()
    }

    return EventSessionService.instance
  }

  async getById(id: number) {
    return this.db.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, id)).get()
  }

  async getByPublicId(publicId: string) {
    return this.db.select().from(tables.eventSessions).where(eq(tables.eventSessions.publicId, publicId)).get()
  }

  async getList() {
    return this.db
      .select()
      .from(tables.eventSessions)
      .all()
  }

  async listByEventId(eventId: number) {
    return this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .orderBy(asc(tables.eventSessions.startsAt))
      .all()
  }

  async getTicketTypes(eventSessionId: number) {
    return this.db
      .select()
      .from(tables.ticketTypes)
      .where(eq(tables.ticketTypes.eventSessionId, eventSessionId))
      .orderBy(asc(tables.ticketTypes.sortOrder))
      .all()
  }

  async getSeatMap(eventSessionId: number): Promise<EventSessionSeatMap> {
    const seats = await this.db
      .select()
      .from(tables.eventSeats)
      .where(eq(tables.eventSeats.eventSessionId, eventSessionId))
      .all()

    const ticketTypes = await this.db
      .select()
      .from(tables.ticketTypes)
      .where(eq(tables.ticketTypes.eventSessionId, eventSessionId))
      .all()

    return { seats, ticketTypes }
  }

  async createForEvent(eventId: number, fallbackVenueId: number, input: EventSessionDraftInput) {
    return this.createForEventInTransaction(this.db, eventId, fallbackVenueId, input)
  }

  async createForEventInTransaction(tx: Transaction, eventId: number, fallbackVenueId: number, input: EventSessionDraftInput, now = new Date()) {
    const venueId = input.venueId || fallbackVenueId

    const session = await tx.insert(tables.eventSessions).values({
      publicId: input.publicId ?? createPublicEventSessionId(),
      eventId,
      venueId,
      label: input.label,
      status: input.status,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      salesStartAt: input.salesStartAt,
      salesEndAt: input.salesEndAt,
      queueEnabled: input.queueEnabled,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    }).returning().get()

    if (!session) {
      throw new Error('Failed to create event session')
    }

    for (let start = 0; start < input.ticketTypes.length; start += D1_INSERT_BATCH_SIZE) {
      const ticketTypeBatch = input.ticketTypes.slice(start, start + D1_INSERT_BATCH_SIZE)
      await tx.insert(tables.ticketTypes).values(
        ticketTypeBatch.map(ticketType => ({
          eventId,
          eventSessionId: session.id,
          venueSectionId: ticketType.venueSectionId ?? null,
          name: ticketType.name,
          description: ticketType.description ?? null,
          priceCents: ticketType.priceCents,
          currency: ticketType.currency,
          capacity: ticketType.capacity,
          color: ticketType.color,
          isReservedSeating: ticketType.isReservedSeating,
          sortOrder: ticketType.sortOrder,
          createdAt: now,
          updatedAt: now,
        })),
      )
    }

    return session
  }

  async updateForEvent(eventId: number, fallbackVenueId: number, input: EventSessionDraftInput) {
    if (!input.id) {
      return this.createForEvent(eventId, fallbackVenueId, input)
    }

    return this.updateForEventInTransaction(this.db, eventId, fallbackVenueId, input)
  }

  async updateForEventInTransaction(tx: Transaction, eventId: number, fallbackVenueId: number, input: EventSessionDraftInput, now = new Date()) {
    if (!input.id) {
      return this.createForEventInTransaction(tx, eventId, fallbackVenueId, input, now)
    }

    const venueId = input.venueId || fallbackVenueId

    const existing = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, input.id)).get()
    if (!existing) {
      throw new Error('Event session not found')
    }

    if (existing.eventId !== eventId) {
      throw new Error('Event session does not belong to event')
    }

    if (existing.status !== 'draft') {
      throw new Error('Session pricing can only be changed while draft.')
    }

    const session = await tx.update(tables.eventSessions).set({
      venueId,
      label: input.label,
      status: input.status,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      salesStartAt: input.salesStartAt,
      salesEndAt: input.salesEndAt,
      queueEnabled: input.queueEnabled,
      updatedAt: now,
    }).where(eq(tables.eventSessions.id, input.id)).returning().get()

    if (!session) {
      throw new Error('Failed to update event session')
    }

    await tx.delete(tables.ticketTypes).where(eq(tables.ticketTypes.eventSessionId, input.id))

    for (let start = 0; start < input.ticketTypes.length; start += D1_INSERT_BATCH_SIZE) {
      const ticketTypeBatch = input.ticketTypes.slice(start, start + D1_INSERT_BATCH_SIZE)
      await tx.insert(tables.ticketTypes).values(
        ticketTypeBatch.map(ticketType => ({
          eventId,
          eventSessionId: input.id,
          venueSectionId: ticketType.venueSectionId ?? null,
          name: ticketType.name,
          description: ticketType.description ?? null,
          priceCents: ticketType.priceCents,
          currency: ticketType.currency,
          capacity: ticketType.capacity,
          color: ticketType.color,
          isReservedSeating: ticketType.isReservedSeating,
          sortOrder: ticketType.sortOrder,
          createdAt: now,
          updatedAt: now,
        })),
      )
    }

    return session
  }

  async publishSession(eventSessionId: number) {
    return this.publishSessionInTransaction(this.db, eventSessionId)
  }

  async publishSessionInTransaction(tx: Transaction, eventSessionId: number, now = new Date()) {
    const session = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }

    if (session.status !== 'draft') {
      return session
    }

    await this.assertCanPublishSessionInTransaction(tx, eventSessionId)

    const venueSections = await tx.select().from(tables.venueSections).where(eq(tables.venueSections.venueId, session.venueId)).all()
    const sectionIds = venueSections.map(section => section.id)
    const venueRows = sectionIds.length > 0
      ? await tx.select().from(tables.venueRows).where(inArray(tables.venueRows.sectionId, sectionIds)).all()
      : []
    const rowIds = venueRows.map(row => row.id)
    const venueSeats = rowIds.length > 0
      ? await tx.select().from(tables.venueSeats).where(inArray(tables.venueSeats.rowId, rowIds)).all()
      : []
    const ticketTypes = await tx.select().from(tables.ticketTypes).where(eq(tables.ticketTypes.eventSessionId, eventSessionId)).all()

    const sectionById = new Map(venueSections.map(section => [section.id, section]))
    const rowById = new Map(venueRows.map(row => [row.id, row]))
    const ticketTypeBySectionId = new Map(ticketTypes.filter(ticketType => ticketType.venueSectionId !== null).map(ticketType => [ticketType.venueSectionId, ticketType]))

    await tx.delete(tables.eventSeats).where(eq(tables.eventSeats.eventSessionId, eventSessionId))

    if (venueSeats.length > 0) {
      for (let start = 0; start < venueSeats.length; start += D1_INSERT_BATCH_SIZE) {
        const seatBatch = venueSeats.slice(start, start + D1_INSERT_BATCH_SIZE)
        await tx.insert(tables.eventSeats).values(
          seatBatch.map((seat) => {
            const row = rowById.get(seat.rowId)
            if (!row) {
              throw new Error('Venue row not found while publishing session')
            }

            const section = sectionById.get(row.sectionId)
            if (!section) {
              throw new Error('Venue section not found while publishing session')
            }

            const ticketType = ticketTypeBySectionId.get(section.id) ?? null

            return {
              eventId: session.eventId,
              eventSessionId,
              venueSeatId: seat.id,
              venueSectionId: section.id,
              ticketTypeId: ticketType?.id ?? null,
              holdId: null,
              orderId: null,
              sectionNameSnapshot: section.name,
              rowLabelSnapshot: row.label,
              seatLabelSnapshot: seat.label,
              displayX: seat.x,
              displayY: seat.y,
              priceCents: ticketType?.priceCents ?? 0,
              currency: ticketType?.currency ?? 'VND',
              status: 'available',
              lockedAt: null,
              soldAt: null,
              createdAt: now,
              updatedAt: now,
            }
          }),
        )
      }
    }

    const publishedSession = await tx.update(tables.eventSessions).set({
      status: 'published',
      publishedAt: now,
      updatedAt: now,
    }).where(eq(tables.eventSessions.id, eventSessionId)).returning().get()

    if (!publishedSession) {
      throw new Error('Failed to publish event session')
    }

    return publishedSession
  }

  async assertCanPublishSession(eventSessionId: number) {
    return this.assertCanPublishSessionInTransaction(this.db, eventSessionId)
  }

  async assertCanPublishSessionInTransaction(tx: Transaction, eventSessionId: number) {
    const session = await tx.select().from(tables.eventSessions).where(eq(tables.eventSessions.id, eventSessionId)).get()
    if (!session) {
      throw new Error('Event session not found')
    }

    if (session.status !== 'draft') {
      return session
    }

    const existingSeats = await tx
      .select()
      .from(tables.eventSeats)
      .where(eq(tables.eventSeats.eventSessionId, eventSessionId))
      .all()

    if (existingSeats.some(seat => seat.status !== 'available' || seat.holdId !== null || seat.orderId !== null)) {
      throw new Error('Session inventory cannot be regenerated after activity starts.')
    }

    return session
  }

  async create(_data: Partial<EventSession>): Promise<EventSession> {
    throw new Error('Use createForEvent to create event sessions')
  }

  async update(_data: Partial<EventSession>): Promise<EventSession> {
    throw new Error('Use updateForEvent to update event sessions')
  }

  async delete(id: number | string): Promise<void> {
    await this.db.delete(tables.eventSessions).where(eq(tables.eventSessions.id, Number(id)))
  }

  async bulkDelete(ids: number[] | string[]): Promise<void> {
    const numericIds = ids.map(id => Number(id))
    if (numericIds.length === 0) {
      return
    }

    await this.db.delete(tables.eventSessions).where(inArray(tables.eventSessions.id, numericIds))
  }
}

export default EventSessionService.getInstance()
