import { releaseSeatHoldSchema } from '#shared/schemas/ticketingSchema'
import holdService from '~~/server/utils/ticketing/holds'
import { success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const holdId = getRouterParam(event, 'holdId')
  const result = releaseSeatHoldSchema.safeParse({ holdPublicId: holdId })
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Hold ID is invalid.', data: result.error })
  }

  const released = await holdService.releaseHold(result.data.holdPublicId, getTicketingSessionKey(event))
  return success(released)
})
