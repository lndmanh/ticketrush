import { createSeatHoldSchema } from '#shared/schemas/ticketingSchema'
import eventSessionService from '~~/server/utils/database/event-session'
import holdService from '~~/server/utils/ticketing/holds'
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

  const sessionKey = getTicketingSessionKey(event)
  const userSession = await requireUserSession(event)
  const result = await readValidatedBody(event, body => createSeatHoldSchema.safeParse({ ...body, eventSessionId: session.id }))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Hold request is invalid.', data: result.error })
  }

  const hold = await holdService.createHold({
    ...result.data,
    sessionKey,
  }, userSession.user?.id)

  return success(hold)
})
