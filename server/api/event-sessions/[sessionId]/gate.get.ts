import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import type { EventSessionGateResponse } from '~~/types/ticketing'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  if (session.status === 'draft' || session.status === 'cancelled') {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  const passToken = getQuery(event).pass
  const customerKey = getTicketingSessionKey(event)
  const shouldQueue = await queueService.shouldQueue(session.id, customerKey, typeof passToken === 'string' ? passToken : undefined)

  const response: EventSessionGateResponse = {
    shouldQueue,
    sessionPublicId: session.publicId,
    eventId: session.eventId,
  }

  return success(response)
})
