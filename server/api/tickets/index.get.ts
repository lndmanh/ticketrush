import { z } from 'zod'
import checkoutService from '~~/server/utils/ticketing/checkout'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'

const ticketsQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const query = await getValidatedQuery(event, rawQuery => ticketsQuerySchema.parse(rawQuery))
  const tickets = await checkoutService.listTicketsForUser(session.user.id)
  const orderItems = tickets.flatMap(ticket => ticket.orderItem ? [ticket.orderItem] : [])
  const localizedOrderItems = query.locale === sourceLocale
    ? orderItems
    : await eventService.localizeOrderItemsForLocale(orderItems, query.locale)
  const orderItemById = new Map(localizedOrderItems.map(orderItem => [orderItem.id, orderItem]))

  const uniqueEvents: NonNullable<(typeof tickets)[number]['event']>[] = []
  const seenEventIds = new Set<number>()
  for (const ticket of tickets) {
    if (!ticket.event || seenEventIds.has(ticket.event.id)) {
      continue
    }

    uniqueEvents.push(ticket.event)
    seenEventIds.add(ticket.event.id)
  }

  const localizedEvents = query.locale === sourceLocale
    ? uniqueEvents
    : await eventService.localizeEventsForLocale(uniqueEvents, query.locale)
  const eventById = new Map(localizedEvents.map(event => [event.id, event]))

  const response: Awaited<ReturnType<typeof checkoutService.listTicketsForUser>> = tickets.map((ticket) => {
    return {
      ...ticket,
      event: ticket.event ? eventById.get(ticket.event.id) ?? ticket.event : ticket.event,
      orderItem: ticket.orderItem ? orderItemById.get(ticket.orderItem.id) ?? ticket.orderItem : ticket.orderItem,
    }
  })
  return success(response)
})
