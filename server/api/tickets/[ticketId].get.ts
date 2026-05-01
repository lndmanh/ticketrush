import checkoutService from '~~/server/utils/ticketing/checkout'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'ticketId')
  if (!ticketId) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Ticket ID is required.' })
  }

  const session = await requireUserSession(event)
  const ticket = await checkoutService.getTicketByPublicId(ticketId, session.user.id)
  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' })
  }

  return success(ticket)
})
