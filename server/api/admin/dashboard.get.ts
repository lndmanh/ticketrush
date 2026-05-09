import type { AdminDashboardResponse, AdminDashboardChartPoint, AdminDashboardEventRow, AdminDashboardCalendarSession } from '~~/types/admin-dashboard'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const db = useDB()
  const [events, venues, eventSessions, eventSeats, orders, tickets, seatHolds, queueEntries] = await Promise.all([
    db.select().from(tables.events).all(),
    db.select().from(tables.venues).all(),
    db.select().from(tables.eventSessions).all(),
    db.select().from(tables.eventSeats).all(),
    db.select().from(tables.orders).all(),
    db.select().from(tables.tickets).all(),
    db.select().from(tables.seatHolds).all(),
    db.select().from(tables.queueEntries).all(),
  ])

  const venueById = new Map(venues.map(venue => [venue.id, venue]))
  const eventById = new Map(events.map(event => [event.id, event]))
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

  const ticketsByOrderId = new Map<number, typeof tickets>()
  for (const ticket of tickets) {
    const current = ticketsByOrderId.get(ticket.orderId) ?? []
    current.push(ticket)
    ticketsByOrderId.set(ticket.orderId, current)
  }

  const confirmedOrders = orders.filter(order => order.status === 'confirmed')
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
  const soldSeatsCount = eventSeats.filter(seat => seat.status === 'sold').length
  const activeEventsCount = events.filter(event => event.status !== 'draft').length
  const activeSessionsCount = eventSessions.filter(session => session.status !== 'draft').length
  const activeHoldsCount = seatHolds.filter(hold => hold.status === 'active').length
  const queueWaitingCount = queueEntries.filter(entry => entry.status === 'waiting').length

  const chartByMonth = new Map<string, { label: string, sortAt: number, revenueCents: number, ticketsSold: number }>()
  for (const order of confirmedOrders) {
    const orderDate = new Date(order.confirmedAt ?? order.createdAt)
    const monthLabel = orderDate.toLocaleDateString('en-US', { month: 'short' })
    const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
    const current = chartByMonth.get(monthKey) ?? { label: monthLabel, sortAt: orderDate.getTime(), revenueCents: 0, ticketsSold: 0 }
    current.revenueCents += order.amountCents
    current.ticketsSold += (ticketsByOrderId.get(order.id) ?? []).length
    chartByMonth.set(monthKey, current)
  }

  const chart: AdminDashboardChartPoint[] = [...chartByMonth.entries()]
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
    events: events.map((event) => {
      const venue = venueById.get(event.venueId)
      const eventSeatsForEvent = seatsByEventId.get(event.id) ?? []
      const eventSessionsForEvent = sessionsByEventId.get(event.id) ?? []
      const nextSession = eventSessionsForEvent
        .filter(session => new Date(session.startsAt).getTime() > now.getTime())
        .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())[0]

      const totalSeatsForEvent = eventSeatsForEvent.length
      const soldSeatsForEvent = eventSeatsForEvent.filter(seat => seat.status === 'sold').length
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
      const soldSeatsForSession = sessionSeats.filter(seat => seat.status === 'sold').length
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

  if (session.status === 'draft') {
    return 'Draft'
  }

  if (endsAtTime !== null && nowTime > endsAtTime) {
    return 'Ended'
  }

  if (endsAtTime === null && nowTime > startsAtTime && session.status !== 'published' && session.status !== 'on_sale') {
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
