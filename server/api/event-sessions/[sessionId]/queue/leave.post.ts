import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
  }

  const result = await queueService.leaveQueue(session.id, getTicketingSessionKey(event))
  return success(result)
})
