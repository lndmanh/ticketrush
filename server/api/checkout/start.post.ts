import { z } from 'zod'
import type { CheckoutStartData } from '~~/types/ticketing'
import checkoutService from '~~/server/utils/ticketing/checkout'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'

const startCheckoutSchema = z.object({
  holdPublicId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const result = await readValidatedBody(event, body => startCheckoutSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const checkout = await checkoutService.startCheckout(
    result.data.holdPublicId,
    getTicketingSessionKey(event),
    session.user.id,
    getSeatmapRealtimeEnv(event).SEATMAP_REALTIME_ROOM,
  )
  const response: CheckoutStartData = {
    publicId: checkout.publicId,
  }

  return success(response)
})
