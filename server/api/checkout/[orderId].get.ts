import checkoutService from '~~/server/utils/ticketing/checkout'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const userSession = await requireUserSession(event)
  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Order ID is required.' })
  }

  const checkout = await checkoutService.getCheckoutByPublicId(orderId)
  if (!checkout || checkout.order.userId !== userSession.user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Checkout not found.' })
  }

  return success(checkout)
})
