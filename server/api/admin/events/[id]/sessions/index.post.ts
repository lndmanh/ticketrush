import { eventSessionDraftSchema } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }

  const parent = await eventService.getById(eventId)
  if (!parent) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const result = await readValidatedBody(event, body => eventSessionDraftSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const created = await eventService.createSession(eventId, result.data)
  const response: Awaited<ReturnType<typeof eventService.createSession>> = created
  return success(response)
})
