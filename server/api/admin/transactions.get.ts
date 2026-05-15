import type { AdminTransactionRow, AdminTransactionSeatInfo } from '~~/types/admin-transactions'
import { and, desc, eq, gte, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { success } from '~~/server/utils/apiResponse'
import { AdminAnalyticsTimeRange, OrderStatus } from '#shared/commonEnums'
import { DEFAULT_ADMIN_ANALYTICS_TIME_RANGE, getAdminAnalyticsRangeStart } from '#shared/adminAnalyticsTimeRanges'

const adminTransactionsQuerySchema = z.object({
  range: z.nativeEnum(AdminAnalyticsTimeRange).default(DEFAULT_ADMIN_ANALYTICS_TIME_RANGE).catch(DEFAULT_ADMIN_ANALYTICS_TIME_RANGE),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => adminTransactionsQuerySchema.parse(rawQuery))
  const rangeStart = getAdminAnalyticsRangeStart(query.range)
  const db = useDB()
  const orders = await db
    .select()
    .from(tables.orders)
    .where(and(
      eq(tables.orders.status, OrderStatus.Confirmed),
      or(gte(tables.orders.confirmedAt, rangeStart), gte(tables.orders.createdAt, rangeStart)),
    ))
    .orderBy(desc(tables.orders.confirmedAt), desc(tables.orders.createdAt))
    .all()

  if (orders.length === 0) {
    return success([])
  }

  const orderIds = orders.map(order => order.id)
  const eventIds = [...new Set(orders.map(order => order.eventId))]
  const [orderItems, events] = await Promise.all([
    db.select().from(tables.orderItems).where(inArray(tables.orderItems.orderId, orderIds)).all(),
    db.select().from(tables.events).where(inArray(tables.events.id, eventIds)).all(),
  ])

  const eventTitleById = new Map(events.map(event => [event.id, event.title]))
  const seatsByOrderId = new Map<number, AdminTransactionSeatInfo[]>()

  for (const item of orderItems) {
    const seats = seatsByOrderId.get(item.orderId) ?? []
    seats.push({
      label: formatSeatLabel(item),
      section: item.sectionLabel,
      row: item.rowLabel,
      seat: item.seatLabel,
      quantity: item.quantity,
    })
    seatsByOrderId.set(item.orderId, seats)
  }

  const transactions: AdminTransactionRow[] = orders
    .map(order => ({
      id: order.id,
      orderId: order.publicId,
      eventTitle: eventTitleById.get(order.eventId) ?? 'Unknown event',
      buyerName: order.customerName,
      buyerEmail: order.customerEmail,
      buyerPhone: order.customerPhone,
      seats: seatsByOrderId.get(order.id) ?? [],
      totalAmountCents: order.amountCents,
      currency: order.currency,
      paymentTime: order.confirmedAt,
      status: order.status,
      createdAt: order.createdAt,
    }))

  return success(transactions)
})

function formatSeatLabel(item: typeof tables.orderItems.$inferSelect) {
  const parts = [item.sectionLabel, item.rowLabel, item.seatLabel]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)

  if (parts.length > 0) {
    return parts.join(' · ')
  }

  return item.ticketLabel
}
