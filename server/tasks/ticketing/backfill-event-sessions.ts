import { and, eq, isNull } from 'drizzle-orm'
import { createPublicEventSessionId } from '~~/server/utils/ticketing/ids'

const backfillTables = {
  ticketTypes: tables.ticketTypes,
  seatHolds: tables.seatHolds,
  orders: tables.orders,
  eventSeats: tables.eventSeats,
  tickets: tables.tickets,
  queueEntries: tables.queueEntries,
  eventMetricBuckets: tables.eventMetricBuckets,
}

export default defineTask({
  meta: {
    name: 'ticketing:backfill-event-sessions',
    description: 'Backfill event sessions for existing ticketing data',
  },
  async run() {
    const db = useDB()
    const events = await db.select().from(tables.events).all()
    let createdSessionCount = 0

    for (const event of events) {
      const existingSession = await db
        .select()
        .from(tables.eventSessions)
        .where(eq(tables.eventSessions.eventId, event.id))
        .orderBy(tables.eventSessions.startsAt)
        .get()

      let sessionId = existingSession?.id
      if (!sessionId) {
        const createdSession = await db.insert(tables.eventSessions).values({
          publicId: createPublicEventSessionId(),
          eventId: event.id,
          venueId: event.venueId,
          label: event.title,
          status: event.status,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          salesStartAt: event.salesStartAt,
          salesEndAt: event.salesEndAt,
          queueEnabled: event.queueEnabled,
          queueActivationThreshold: 250,
          queueBatchSize: event.queueBatchSize,
          queueWindowSeconds: event.queueWindowSeconds,
          publishedAt: event.publishedAt,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        }).returning().get()

        if (!createdSession) {
          throw new Error('Failed to create backfill session')
        }

        sessionId = createdSession.id
        createdSessionCount += 1
      }

      const updateTargets = [
        { table: backfillTables.ticketTypes, column: backfillTables.ticketTypes.eventId },
        { table: backfillTables.seatHolds, column: backfillTables.seatHolds.eventId },
        { table: backfillTables.orders, column: backfillTables.orders.eventId },
        { table: backfillTables.eventSeats, column: backfillTables.eventSeats.eventId },
        { table: backfillTables.tickets, column: backfillTables.tickets.eventId },
        { table: backfillTables.queueEntries, column: backfillTables.queueEntries.eventId },
        { table: backfillTables.eventMetricBuckets, column: backfillTables.eventMetricBuckets.eventId },
      ]

      for (const target of updateTargets) {
        await db
          .update(target.table)
          .set({ eventSessionId: sessionId })
          .where(and(eq(target.column, event.id), isNull(target.table.eventSessionId)))
      }
    }

    return {
      result: 'Event sessions backfilled',
      createdSessionCount,
    }
  },
})
