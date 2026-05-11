import { venueTranslationSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
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
  const venueId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(venueId) || venueId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_VENUE_ID', message: 'Venue ID is invalid.' })
  }

  const locale = getRouterParam(event, 'locale') ?? ''
  const current = await venueService.getById(venueId)
  if (!current) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'VENUE_NOT_FOUND', message: 'Venue not found.' })
  }

  const result = await readValidatedBody(event, body => venueTranslationSchema.safeParse(bodyWithLocale(body, locale)))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const translations = await venueService.saveTranslation(venueId, result.data)
  return success({
    sourceLocale,
    venue: current,
    translations,
  })
})
