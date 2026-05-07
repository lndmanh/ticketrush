import { createSeatHoldSchema } from '#shared/schemas/ticketingSchema'
import type { HoldData } from '~~/types/ticketing'
import eventSessionService from '~~/server/utils/database/event-session'
import holdService from '~~/server/utils/ticketing/holds'
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

  const sessionKey = getTicketingSessionKey(event)
  const userSession = await requireUserSession(event)
  const result = await readValidatedBody(event, body => createSeatHoldSchema.safeParse({ ...body, eventSessionId: session.id }))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Hold request is invalid.', data: result.error })
  }

  const holdBundle = await holdService.createHold({
    ...result.data,
    sessionKey,
  }, userSession.user?.id)
  if (!holdBundle) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to create seat hold.' })
  }

  const response: HoldData = {
    hold: {
      publicId: holdBundle.hold.publicId,
    },
  }

  return success(response)
})
