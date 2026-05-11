import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'
import { sourceLocale } from '~~/i18n-constants'

export default defineEventHandler(async (event) => {
  const venueId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(venueId) || venueId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_VENUE_ID', message: 'Venue ID is invalid.' })
  }

  const current = await venueService.getById(venueId)
  if (!current) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'VENUE_NOT_FOUND', message: 'Venue not found.' })
  }

  const translations = await venueService.getTranslations(venueId)
  return success({
    sourceLocale,
    venue: current,
    translations,
  })
})
