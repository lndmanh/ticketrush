import { confirmCheckoutSchema } from '#shared/schemas/ticketingSchema'
import checkoutService from '~~/server/utils/ticketing/checkout'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const result = await readValidatedBody(event, body => confirmCheckoutSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const { SEATMAP_REALTIME_ROOM: realtimeNamespace } = getSeatmapRealtimeEnv(event)
  const checkout = await checkoutService.confirmCheckout(
    result.data.checkoutSessionId,
    result.data.holdPublicId,
    getTicketingSessionKey(event),
    {
      userId: session.user.id,
      customerName: result.data.customerName,
      customerEmail: result.data.customerEmail,
      customerPhone: result.data.customerPhone,
      customerAgeBracket: result.data.customerAgeBracket,
      customerGender: result.data.customerGender,
      ticketHolders: result.data.ticketHolders,
    },
    realtimeNamespace,
  )

  const response: Awaited<ReturnType<typeof checkoutService.confirmCheckout>> = checkout
  return success(response)
})
