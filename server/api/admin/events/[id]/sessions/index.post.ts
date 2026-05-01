import { eventSessionDraftSchema } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const parent = await eventService.getById(eventId)
  if (!parent) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
  }

  const result = await readValidatedBody(event, body => eventSessionDraftSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Session data is invalid.', data: result.error })
  }

  const created = await eventService.createSession(eventId, result.data)
  return success(created)
})
