import type { VenueLayoutSyncPreview } from '~~/types/admin-events'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'

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

  try {
    const preview: VenueLayoutSyncPreview = await eventSessionService.getVenueLayoutSyncPreview(eventId, sessionId)
    return success(preview)
  } catch (error) {
    const message = toErrorMessage(error)
    if (message === 'Event session not found') {
      throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
    }
    if (message === 'Event session does not belong to event') {
      throw apiError({ status: 400, statusText: 'Bad Request', code: 'SESSION_EVENT_MISMATCH', message: 'Session does not belong to this event.' })
    }
    if (message === 'Venue not found') {
      throw apiError({ status: 404, statusText: 'Not Found', code: 'VENUE_NOT_FOUND', message: 'Venue not found.' })
    }
    throw error
  }
})
