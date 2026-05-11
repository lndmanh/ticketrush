import { sessionSeatOverridesUpdateSchema } from '#shared/schemas/ticketingSchema'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { EventStatus } from '#shared/commonEnums'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  const sessionId = Number(getRouterParam(event, 'sessionId'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is invalid.' })
  }

  const session = await eventSessionService.getById(sessionId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }
  if (session.eventId !== eventId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'SESSION_EVENT_MISMATCH', message: 'Session does not belong to this event.' })
  }
  if (session.status !== EventStatus.Draft) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'SESSION_NOT_DRAFT', message: 'Session pricing can only be changed while draft.' })
  }

  const result = await readValidatedBody(event, body => sessionSeatOverridesUpdateSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const updated = await eventSessionService.updateSeatOverrides(sessionId, eventId, session.venueId, result.data.seatOverrides)
  return success(updated)
})
