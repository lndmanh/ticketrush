import { createEventSchema } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createEventSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const created = await eventService.create(result.data)
  const response: Awaited<ReturnType<typeof eventService.create>> = created
  return success(response)
})
