import checkoutService from '~~/server/utils/ticketing/checkout'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'ticketId')
  if (!ticketId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_TICKET_ID', message: 'Ticket ID is required.' })
  }

  const session = await requireUserSession(event)
  const ticket = await checkoutService.getTicketByPublicId(ticketId, session.user.id)
  if (!ticket) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' })
  }

  const response: Awaited<ReturnType<typeof checkoutService.getTicketByPublicId>> = ticket
  return success(response)
})
