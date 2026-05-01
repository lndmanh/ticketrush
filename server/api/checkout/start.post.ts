import { z } from 'zod'
import checkoutService from '~~/server/utils/ticketing/checkout'
import { success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

const startCheckoutSchema = z.object({
  holdPublicId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const result = await readValidatedBody(event, body => startCheckoutSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Checkout request is invalid.', data: result.error })
  }

  const checkout = await checkoutService.startCheckout(result.data.holdPublicId, getTicketingSessionKey(event))
  return success(checkout)
})
