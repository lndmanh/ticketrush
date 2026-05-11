import eventService from '~~/server/utils/database/event'
import { apiError, success } from '~~/server/utils/apiResponse'
import { sourceLocale } from '~~/i18n-constants'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }

  const current = await eventService.getById(eventId)
  if (!current) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const translations = await eventService.getTranslations(eventId)
  return success({
    sourceLocale,
    event: current,
    ...translations,
  })
})
