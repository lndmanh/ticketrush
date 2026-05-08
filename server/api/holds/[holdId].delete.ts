import { releaseSeatHoldSchema } from '#shared/schemas/ticketingSchema'
import holdService from '~~/server/utils/ticketing/holds'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const holdId = getRouterParam(event, 'holdId')
  const result = releaseSeatHoldSchema.safeParse({ holdPublicId: holdId })
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_HOLD_ID', message: 'Hold ID is invalid.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const released = await holdService.releaseHold(result.data.holdPublicId, getTicketingSessionKey(event))
  const response: Awaited<ReturnType<typeof holdService.releaseHold>> = released
  return success(response)
})
