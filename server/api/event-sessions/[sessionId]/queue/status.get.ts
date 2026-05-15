import type { QueueState } from '~~/types/ticketing'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { refreshQueueStatusForSession } from '~~/server/utils/ticketing/queue-status'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const response: QueueState | null = await refreshQueueStatusForSession(session.id, getTicketingSessionKey(event))
  return success(response)
})
