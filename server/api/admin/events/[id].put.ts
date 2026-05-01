import { updateEventSchema } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const current = await eventService.getById(eventId)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
  }

  const result = await readValidatedBody(event, body => updateEventSchema.safeParse({ ...body, id: eventId }))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event update data is invalid.', data: result.error })
  }

  const updated = await eventService.update(result.data)
  return success(updated)
})
