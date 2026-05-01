import { joinQueueSchema } from '#shared/schemas/ticketingSchema'
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

  const userSession = await requireUserSession(event)
  const result = await readValidatedBody(event, body => joinQueueSchema.safeParse({ ...body, eventSessionId: session.id }))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Queue request is invalid.', data: result.error })
  }

  const joined = await queueService.joinQueue(session.id, getTicketingSessionKey(event), userSession.user?.id)
  return success(joined)
})
