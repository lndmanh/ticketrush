import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(eventId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const session = await eventSessionService.getDefaultSessionForEvent(eventId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
  }

  await queueService.expireAdmittedEntries()

  const status = await queueService.getStatus(session.id, getTicketingSessionKey(event))
  return success(status)
})
