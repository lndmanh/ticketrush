import checkoutService from '~~/server/utils/ticketing/checkout'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const userSession = await requireUserSession(event)
  const checkout = await checkoutService.getActiveCheckoutForUser(userSession.user.id)

  if (!checkout) {
    return success(null)
  }

  return success(checkout)
})
