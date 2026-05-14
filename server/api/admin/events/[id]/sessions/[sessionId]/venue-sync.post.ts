import { venueLayoutSyncApplySchema } from '#shared/schemas/ticketingSchema'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toErrorMessage(error: unknown): string | null {
  if (!isRecord(error) || typeof error.message !== 'string') return null
  return error.message
}

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  const sessionId = Number(getRouterParam(event, 'sessionId'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is invalid.' })
  }

  const result = await readValidatedBody(event, body => venueLayoutSyncApplySchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  try {
    const updated = await eventSessionService.applyVenueLayoutSync(eventId, sessionId, result.data.mappings)
    return success(updated)
  }
  catch (error) {
    const message = toErrorMessage(error)
    if (message === 'Event session not found') {
      throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
    }
    if (message === 'Event session does not belong to event' || message === 'Venue not found' || message === 'Venue layout sync mappings must cover every current section exactly once' || message === 'Venue layout sync mappings must not duplicate current sections' || message === 'Venue layout sync mappings must include every current section' || message?.startsWith('Venue layout sync mapping references unknown source section') || message?.startsWith('Venue layout sync mapping references unknown current section')) {
      throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SYNC_TARGET', message: message ?? 'Invalid venue layout sync target.' })
    }
    if (message === 'Session pricing can only be changed while draft.' || message === 'Session inventory cannot be regenerated after activity starts.') {
      throw apiError({ status: 409, statusText: 'Conflict', code: 'SESSION_SYNC_CONFLICT', message: message })
    }
    throw error
  }
})
