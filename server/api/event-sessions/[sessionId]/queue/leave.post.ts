import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { apiError, success } from '~~/server/utils/apiResponse'
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

  const result = await queueService.leaveQueue(session.id, getTicketingSessionKey(event))
  const response: Awaited<ReturnType<typeof queueService.leaveQueue>> = result
  return success(response)
})
