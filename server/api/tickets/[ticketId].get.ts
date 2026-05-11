import { z } from 'zod'
import checkoutService from '~~/server/utils/ticketing/checkout'
import eventService from '~~/server/utils/database/event'
import { apiError, success } from '~~/server/utils/apiResponse'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'

const ticketDetailQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'ticketId')
  if (!ticketId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_TICKET_ID', message: 'Ticket ID is required.' })
  }

  const session = await requireUserSession(event)
  const query = await getValidatedQuery(event, rawQuery => ticketDetailQuerySchema.parse(rawQuery))
  const ticket = await checkoutService.getTicketByPublicId(ticketId, session.user.id)
  if (!ticket) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' })
  }

  const localizedEvent = ticket.event
    ? await eventService.getLocalizedById(ticket.event.id, query.locale)
    : undefined
  const localizedOrderItems = ticket.orderItem
    ? await eventService.localizeOrderItemsForLocale([ticket.orderItem], query.locale)
    : []
  const response: Awaited<ReturnType<typeof checkoutService.getTicketByPublicId>> = {
    ...ticket,
    event: localizedEvent ?? ticket.event,
    orderItem: localizedOrderItems[0] ?? ticket.orderItem,
  }
  return success(response)
})
