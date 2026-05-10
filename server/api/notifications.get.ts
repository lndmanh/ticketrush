import { desc, eq } from 'drizzle-orm'
import { success } from '~~/server/utils/apiResponse'
import holdService from '~~/server/utils/ticketing/holds'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDB()
  await holdService.expireStaleHolds()
  const now = Date.now()

  const [holds, orders, tickets, events, sessions, seats] = await Promise.all([
    db.select().from(tables.seatHolds).where(eq(tables.seatHolds.userId, session.user.id)).all(),
    db.select().from(tables.orders).where(eq(tables.orders.userId, session.user.id)).orderBy(desc(tables.orders.updatedAt)).all(),
    db.select().from(tables.tickets).where(eq(tables.tickets.userId, session.user.id)).orderBy(desc(tables.tickets.issuedAt)).all(),
    db.select().from(tables.events).all(),
    db.select().from(tables.eventSessions).all(),
    db.select().from(tables.eventSeats).all(),
  ])

  const eventById = new Map(events.map(eventRow => [eventRow.id, eventRow]))
  const sessionById = new Map(sessions.map(sessionRow => [sessionRow.id, sessionRow]))
  const ordersByHoldId = new Map(orders.filter(order => order.holdId !== null).map(order => [order.holdId, order]))
  const activeHolds = holds.filter(hold => hold.status === 'active' && hold.expiresAt.getTime() > now)
  const expiredHolds = holds.filter((hold) => {
    const notificationTime = hold.releasedAt ?? hold.expiresAt
    const isRecent = now - notificationTime.getTime() <= 24 * 60 * 60 * 1000
    return hold.status === 'expired' && isRecent
  })

  const holdNotifications = activeHolds.map((hold) => {
    const order = ordersByHoldId.get(hold.id)
    const eventRow = eventById.get(hold.eventId)
    const sessionRow = hold.eventSessionId ? sessionById.get(hold.eventSessionId) : null
    const heldSeatCount = seats.filter(seat => seat.holdId === hold.id).length

    return {
      id: `hold-${hold.publicId}`,
      kind: 'hold',
      severity: 'warning',
      titleKey: 'notifications.hold_title',
      descriptionKey: 'notifications.hold_desc',
      descriptionParams: {
        count: heldSeatCount,
        event: eventRow?.title ?? 'this event',
      },
      href: order ? `/checkout/${order.publicId}?hold=${hold.publicId}` : null,
      createdAt: hold.createdAt,
      expiresAt: hold.expiresAt,
      eventTitle: eventRow?.title ?? null,
      sessionLabel: sessionRow?.label ?? null,
    }
  })

  const expiredHoldNotifications = expiredHolds.map((hold) => {
    const eventRow = eventById.get(hold.eventId)
    const sessionRow = hold.eventSessionId ? sessionById.get(hold.eventSessionId) : null
    const order = ordersByHoldId.get(hold.id)

    return {
      id: `hold-expired-${hold.publicId}`,
      kind: 'failed',
      severity: 'error',
      titleKey: 'notifications.hold_expired_title',
      descriptionKey: 'notifications.hold_expired_desc',
      descriptionParams: {
        event: eventRow?.title ?? 'this event',
      },
      href: eventRow ? `/events/${eventRow.slug}` : null,
      createdAt: order?.cancelledAt ?? hold.releasedAt ?? hold.expiresAt,
      expiresAt: null,
      eventTitle: eventRow?.title ?? null,
      sessionLabel: sessionRow?.label ?? null,
    }
  })

  const confirmedOrderNotifications = orders
    .filter(order => order.status === 'confirmed')
    .slice(0, 3)
    .map((order) => {
      const eventRow = eventById.get(order.eventId)

      return {
        id: `order-${order.publicId}`,
        kind: 'payment',
        severity: 'success',
        titleKey: 'notifications.payment_confirmed_title',
        descriptionKey: 'notifications.payment_confirmed_desc',
        descriptionParams: {
          event: eventRow?.title ?? 'Your event',
        },
        href: '/tickets',
        createdAt: order.confirmedAt ?? order.updatedAt,
        expiresAt: null,
        eventTitle: eventRow?.title ?? null,
        sessionLabel: null,
      }
    })

  const upcomingTicketNotifications = tickets
    .map((ticket) => {
      const eventRow = eventById.get(ticket.eventId)
      const sessionRow = ticket.eventSessionId ? sessionById.get(ticket.eventSessionId) : null

      if (!sessionRow || sessionRow.startsAt.getTime() < now) {
        return null
      }

      return {
        id: `ticket-${ticket.publicId}`,
        kind: 'event',
        severity: 'info',
        titleKey: 'notifications.upcoming_event_title',
        descriptionKey: 'notifications.upcoming_event_desc',
        descriptionParams: {
          event: eventRow?.title ?? 'Your event',
          time: sessionRow.startsAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        },
        href: '/tickets',
        createdAt: ticket.issuedAt,
        expiresAt: null,
        eventTitle: eventRow?.title ?? null,
        sessionLabel: sessionRow.label,
      }
    })
    .filter((notification): notification is NonNullable<typeof notification> => notification !== null)
    .slice(0, 3)

  const notifications = [
    ...holdNotifications,
    ...expiredHoldNotifications,
    ...confirmedOrderNotifications,
    ...upcomingTicketNotifications,
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return success({
    notifications,
    unreadCount: notifications.filter(notification => notification.kind === 'hold' || notification.kind === 'payment' || notification.kind === 'failed').length,
  })
})
