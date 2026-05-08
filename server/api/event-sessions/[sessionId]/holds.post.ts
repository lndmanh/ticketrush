import { createSeatHoldSchema } from '#shared/schemas/ticketingSchema'
import type { HoldData } from '~~/types/ticketing'
import eventSessionService from '~~/server/utils/database/event-session'
import holdService from '~~/server/utils/ticketing/holds'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const sessionKey = getTicketingSessionKey(event)
  const userSession = await requireUserSession(event)
  const result = await readValidatedBody(event, body => createSeatHoldSchema.safeParse({ ...body, eventSessionId: session.id }))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const holdBundle = await holdService.createHold({
    ...result.data,
    sessionKey,
  }, userSession.user?.id)
  if (!holdBundle) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'ERROR', message: 'Failed to create seat hold.' })
  }

  const response: HoldData = {
    hold: {
      publicId: holdBundle.hold.publicId,
    },
  }

  return success(response)
})
