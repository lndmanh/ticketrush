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
  const localizedOrderItems = await eventService.localizeOrderItemsForLocale(
    tickets.flatMap(ticket => ticket.orderItem ? [ticket.orderItem] : []),
    query.locale,
  )
  const orderItemById = new Map(localizedOrderItems.map(orderItem => [orderItem.id, orderItem]))
  const response: Awaited<ReturnType<typeof checkoutService.listTicketsForUser>> = await Promise.all(tickets.map(async (ticket) => {
    const localizedEvent = ticket.event
      ? await eventService.getLocalizedById(ticket.event.id, query.locale)
      : undefined

    return {
      ...ticket,
      event: localizedEvent ?? ticket.event,
      orderItem: ticket.orderItem ? orderItemById.get(ticket.orderItem.id) ?? ticket.orderItem : ticket.orderItem,
    }
  }))
  return success(response)
})
