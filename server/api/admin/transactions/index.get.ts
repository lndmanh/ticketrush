import type { AdminTransactionRow, AdminTransactionSeatInfo } from '~~/types/admin-transactions'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const db = useDB()
  const [orders, orderItems, events] = await Promise.all([
    db.select().from(tables.orders).all(),
    db.select().from(tables.orderItems).all(),
    db.select().from(tables.events).all(),
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
    .sort((left, right) => {
      const leftDate = new Date(left.paymentTime ?? left.createdAt).getTime()
      const rightDate = new Date(right.paymentTime ?? right.createdAt).getTime()
      return rightDate - leftDate
    })

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
