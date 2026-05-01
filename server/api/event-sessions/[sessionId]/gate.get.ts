import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found.' })
  }

  if (session.status === 'draft' || session.status === 'cancelled') {
    throw createError({ statusCode: 404, statusMessage: 'Session not found.' })
  }

  const passToken = getQuery(event).pass
  const customerKey = getTicketingSessionKey(event)
  const shouldQueue = await queueService.shouldQueue(session.id, customerKey, typeof passToken === 'string' ? passToken : undefined)

  return success({
    shouldQueue,
    sessionPublicId: session.publicId,
    eventId: session.eventId,
  })
})
