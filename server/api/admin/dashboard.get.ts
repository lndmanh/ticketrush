import { and, desc, eq, gte, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import type { AdminDashboardResponse, AdminDashboardChartPoint, AdminDashboardEventRow, AdminDashboardCalendarSession } from '~~/types/admin-dashboard'
import { success } from '~~/server/utils/apiResponse'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'
import { getDisplayDateLocale } from '~~/shared/utils/locales'
import { localizeEvent, localizeVenue, mapEventTranslationsByEventId, mapVenueTranslationsByVenueId, resolveContentLocale } from '~~/server/utils/i18n/content-localization'
import { AdminAnalyticsTimeRange, EventStatus, HoldStatus, OrderStatus, QueueStatus, SeatStatus } from '#shared/commonEnums'
import { DEFAULT_ADMIN_ANALYTICS_TIME_RANGE, getAdminAnalyticsRangeStart } from '#shared/adminAnalyticsTimeRanges'

const adminDashboardQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
  range: z.nativeEnum(AdminAnalyticsTimeRange).default(DEFAULT_ADMIN_ANALYTICS_TIME_RANGE).catch(DEFAULT_ADMIN_ANALYTICS_TIME_RANGE),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => adminDashboardQuerySchema.parse(rawQuery))
  const contentLocale = resolveContentLocale(query.locale)
  const rangeStart = getAdminAnalyticsRangeStart(query.range)
  const db = useDB()
  const [events, venues, eventSessions, eventSeats, seatHolds, queueEntries] = await Promise.all([
    db.select().from(tables.events).all(),
    db.select().from(tables.venues).all(),
    db.select().from(tables.eventSessions).all(),
    db.select().from(tables.eventSeats).all(),
    db.select().from(tables.seatHolds).where(eq(tables.seatHolds.status, HoldStatus.Active)).all(),
    db.select().from(tables.queueEntries).where(eq(tables.queueEntries.status, QueueStatus.Waiting)).all(),
  ])

  const eventIds = events.map(eventItem => eventItem.id)
  const venueIds = venues.map(venue => venue.id)
  const eventTranslations = contentLocale === sourceLocale || eventIds.length === 0
    ? []
    : await db
        .select()
        .from(tables.eventTranslations)
        .where(and(
          inArray(tables.eventTranslations.eventId, eventIds),
          eq(tables.eventTranslations.locale, contentLocale),
        ))
        .all()
  const venueTranslations = contentLocale === sourceLocale || venueIds.length === 0
    ? []
    : await db
        .select()
        .from(tables.venueTranslations)
        .where(and(
          inArray(tables.venueTranslations.venueId, venueIds),
          eq(tables.venueTranslations.locale, contentLocale),
        ))
        .all()
  const eventTranslationByEventId = mapEventTranslationsByEventId(eventTranslations)
  const venueTranslationByVenueId = mapVenueTranslationsByVenueId(venueTranslations)
  const localizedEvents = events.map(eventItem => localizeEvent(eventItem, eventTranslationByEventId.get(eventItem.id)))
  const localizedVenues = venues.map(venue => localizeVenue(venue, venueTranslationByVenueId.get(venue.id)))
  const venueById = new Map(localizedVenues.map(venue => [venue.id, venue]))
  const eventById = new Map(localizedEvents.map(eventItem => [eventItem.id, eventItem]))
  const seatsByEventId = new Map<number, typeof eventSeats>()
  const seatsBySessionId = new Map<number, typeof eventSeats>()
  for (const seat of eventSeats) {
    const current = seatsByEventId.get(seat.eventId) ?? []
    current.push(seat)
    seatsByEventId.set(seat.eventId, current)

    if (seat.eventSessionId !== null) {
      const currentSessionSeats = seatsBySessionId.get(seat.eventSessionId) ?? []
      currentSessionSeats.push(seat)
      seatsBySessionId.set(seat.eventSessionId, currentSessionSeats)
    }
  }

  const sessionsByEventId = new Map<number, typeof eventSessions>()
  for (const session of eventSessions) {
    const current = sessionsByEventId.get(session.eventId) ?? []
    current.push(session)
    sessionsByEventId.set(session.eventId, current)
  }

  const confirmedOrders = await db.select().from(tables.orders).where(and(
    eq(tables.orders.status, OrderStatus.Confirmed),
    or(gte(tables.orders.confirmedAt, rangeStart), gte(tables.orders.createdAt, rangeStart)),
  )).orderBy(desc(tables.orders.confirmedAt), desc(tables.orders.createdAt)).all()
  const confirmedOrderIds = confirmedOrders.map(order => order.id)
  const tickets = confirmedOrderIds.length > 0
    ? await db.select().from(tables.tickets).where(inArray(tables.tickets.orderId, confirmedOrderIds)).all()
    : []
  const ticketsByOrderId = new Map<number, typeof tickets>()
  for (const ticket of tickets) {
    const current = ticketsByOrderId.get(ticket.orderId) ?? []
    current.push(ticket)
    ticketsByOrderId.set(ticket.orderId, current)
  }
  const confirmedOrdersByEventId = new Map<number, typeof confirmedOrders>()
  const confirmedOrdersBySessionId = new Map<number, typeof confirmedOrders>()
  for (const order of confirmedOrders) {
    const currentEventOrders = confirmedOrdersByEventId.get(order.eventId) ?? []
    currentEventOrders.push(order)
    confirmedOrdersByEventId.set(order.eventId, currentEventOrders)

    if (order.eventSessionId !== null) {
      const currentSessionOrders = confirmedOrdersBySessionId.get(order.eventSessionId) ?? []
      currentSessionOrders.push(order)
      confirmedOrdersBySessionId.set(order.eventSessionId, currentSessionOrders)
    }
  }
  const now = new Date()
  const totalSeats = eventSeats.length
  const soldSeatsCount = eventSeats.filter(seat => seat.status === SeatStatus.Sold).length
  const activeEventsCount = events.filter(event => event.status !== EventStatus.Draft).length
  const activeSessionsCount = eventSessions.filter(session => session.status !== EventStatus.Draft).length
  const activeHoldsCount = seatHolds.length
  const queueWaitingCount = queueEntries.length

  const chartByDay = new Map<string, { label: string, sortAt: number, revenueCents: number, ticketsSold: number }>()
  for (const order of confirmedOrders) {
    const orderDate = new Date(order.confirmedAt ?? order.createdAt)
    const dayLabel = orderDate.toLocaleDateString(getDisplayDateLocale(contentLocale), { month: 'short', day: 'numeric' })
    const dayKey = getIsoDate(orderDate)
    const current = chartByDay.get(dayKey) ?? { label: dayLabel, sortAt: orderDate.getTime(), revenueCents: 0, ticketsSold: 0 }
    current.revenueCents += order.amountCents
    current.ticketsSold += (ticketsByOrderId.get(order.id) ?? []).length
    chartByDay.set(dayKey, current)
  }

  const chart: AdminDashboardChartPoint[] = [...chartByDay.entries()]
    .sort((left, right) => left[1].sortAt - right[1].sortAt)
    .map(([, value]) => ({
      label: value.label,
      revenueCents: value.revenueCents,
      ticketsSold: value.ticketsSold,
    }))

  const response: AdminDashboardResponse = {
    summary: {
      totalRevenueCents: confirmedOrders.reduce((total, order) => total + order.amountCents, 0),
      totalSeatsListed: totalSeats,
      soldSeatsCount,
      ticketsIssuedCount: tickets.length,
      totalViews: 0,
      occupancyRate: totalSeats > 0 ? soldSeatsCount / totalSeats : 0,
      activeEventsCount,
      activeSessionsCount,
      activeHoldsCount,
      queueWaitingCount,
    },
    chart,
    events: localizedEvents.map((event) => {
      const venue = venueById.get(event.venueId)
      const eventSeatsForEvent = seatsByEventId.get(event.id) ?? []
      const eventSessionsForEvent = sessionsByEventId.get(event.id) ?? []
      const nextSession = eventSessionsForEvent
        .filter(session => new Date(session.startsAt).getTime() > now.getTime())
        .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())[0]

      const totalSeatsForEvent = eventSeatsForEvent.length
      const soldSeatsForEvent = eventSeatsForEvent.filter(seat => seat.status === SeatStatus.Sold).length
      const eventOrders = confirmedOrdersByEventId.get(event.id) ?? []
      const revenueCents = eventOrders.reduce((total, order) => total + order.amountCents, 0)

      const row: AdminDashboardEventRow = {
        id: event.id,
        title: event.title,
        status: event.status,
        venueName: venue?.name ?? '',
        venueCity: venue?.city ?? '',
        startsAt: event.startsAt,
        nextSessionAt: nextSession?.startsAt ?? null,
        totalSeats: totalSeatsForEvent,
        soldSeats: soldSeatsForEvent,
        revenueCents,
        totalViews: 0,
      }

      return row
    }),
    sessions: eventSessions.map((session) => {
      const event = eventById.get(session.eventId)
      const venue = venueById.get(session.venueId)
      const sessionSeats = seatsBySessionId.get(session.id) ?? []
      const sessionOrders = confirmedOrdersBySessionId.get(session.id) ?? []
      const totalSeatsForSession = sessionSeats.length
      const soldSeatsForSession = sessionSeats.filter(seat => seat.status === SeatStatus.Sold).length
      const revenueCents = sessionOrders.reduce((total, order) => total + order.amountCents, 0)
      const statusLabel = getSessionStatusLabel(session, now)

      const row: AdminDashboardCalendarSession = {
        id: session.id,
        publicId: session.publicId,
        eventId: session.eventId,
        eventTitle: event?.title ?? '',
        label: session.label,
        status: session.status,
        statusLabel,
        venueName: venue?.name ?? '',
        venueCity: venue?.city ?? '',
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        salesStartAt: session.salesStartAt,
        salesEndAt: session.salesEndAt,
        totalSeats: totalSeatsForSession,
        soldSeats: soldSeatsForSession,
        revenueCents,
      }

      return row
    }),
  }

  return success(response)
})

function getSessionStatusLabel(session: typeof tables.eventSessions.$inferSelect, now: Date) {
  const nowTime = now.getTime()
  const startsAtTime = new Date(session.startsAt).getTime()
  const endsAtTime = session.endsAt ? new Date(session.endsAt).getTime() : null
  const salesStartTime = new Date(session.salesStartAt).getTime()
  const salesEndTime = new Date(session.salesEndAt).getTime()

  if (session.status === EventStatus.Draft) {
    return 'Draft'
  }

  if (endsAtTime !== null && nowTime > endsAtTime) {
    return 'Ended'
  }

  if (endsAtTime === null && nowTime > startsAtTime && session.status !== EventStatus.Published && session.status !== EventStatus.OnSale) {
    return 'Ended'
  }

  if (startsAtTime > nowTime && startsAtTime - nowTime <= 24 * 60 * 60 * 1000) {
    return 'Starting soon'
  }

  if (salesStartTime <= nowTime && nowTime <= salesEndTime && startsAtTime > nowTime) {
    return 'Selling'
  }

  if (startsAtTime <= nowTime && (endsAtTime === null || nowTime <= endsAtTime)) {
    return 'Live'
  }

  return 'Scheduled'
}

function getIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
