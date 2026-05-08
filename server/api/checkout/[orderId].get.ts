import checkoutService from '~~/server/utils/ticketing/checkout'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const userSession = await requireUserSession(event)
  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_ORDER_ID', message: 'Order ID is required.' })
  }

  const checkout = await checkoutService.getCheckoutByPublicId(orderId)
  if (!checkout || checkout.order.userId !== userSession.user.id) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'CHECKOUT_NOT_FOUND', message: 'Checkout not found.' })
  }

  const response: Awaited<ReturnType<typeof checkoutService.getCheckoutByPublicId>> = checkout
  return success(response)
})
