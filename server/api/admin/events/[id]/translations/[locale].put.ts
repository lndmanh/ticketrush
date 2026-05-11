import { eventTranslationSchema } from '#shared/schemas/ticketingSchema'
import eventService from '~~/server/utils/database/event'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { sourceLocale } from '~~/i18n-constants'

function bodyWithLocale(body: unknown, locale: string) {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return {
      ...body,
      locale,
    }
  }

  return { locale }
}

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }

  const locale = getRouterParam(event, 'locale') ?? ''
  const current = await eventService.getById(eventId)
  if (!current) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const result = await readValidatedBody(event, body => eventTranslationSchema.safeParse(bodyWithLocale(body, locale)))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  try {
    const translations = await eventService.saveTranslation(eventId, result.data)
    return success({
      sourceLocale,
      event: current,
      ...translations,
    })
  }
  catch (error) {
    if (error instanceof Error && error.message === 'Ticket type does not belong to this event') {
      throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_TICKET_TYPE', message: error.message })
    }

    throw error
  }
})
