import { createEventSchema } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createEventSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event data is invalid.', data: result.error })
  }

  const created = await eventService.create(result.data)
  return success(created)
})
