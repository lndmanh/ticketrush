import { z } from 'zod'
import checkoutService from '~~/server/utils/ticketing/checkout'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

const cancelCheckoutParamsSchema = z.object({
  orderPublicId: z.string().trim().min(1),
})

export default defineEventHandler(async (event) => {
  const result = cancelCheckoutParamsSchema.safeParse({ orderPublicId: getRouterParam(event, 'orderId') })
  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      code: 'INVALID_ORDER_ID',
      message: 'Order ID is invalid.',
      fieldErrors: zodErrorToFieldErrors(result.error),
      cause: result.error,
    })
  }

  const userSession = await requireUserSession(event)
  const { SEATMAP_REALTIME_ROOM: realtimeNamespace } = getSeatmapRealtimeEnv(event)
  const cancelled = await checkoutService.cancelPendingCheckout(
    result.data.orderPublicId,
    userSession.user.id,
    getTicketingSessionKey(event),
    realtimeNamespace,
  )

  return success(cancelled)
})
