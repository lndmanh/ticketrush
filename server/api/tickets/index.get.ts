import checkoutService from '~~/server/utils/ticketing/checkout'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const tickets = await checkoutService.listTicketsForUser(session.user.id)
  const response: Awaited<ReturnType<typeof checkoutService.listTicketsForUser>> = tickets
  return success(response)
})
