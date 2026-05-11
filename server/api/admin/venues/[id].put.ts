import { updateVenueSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isVenueSlugConflict(error: unknown) {
  if (!isRecord(error)) {
    return false
  }

  const message = typeof error.message === 'string' ? error.message : ''
  const causeMessage = isRecord(error.cause) && typeof error.cause.message === 'string' ? error.cause.message : ''

  return (message.includes('UNIQUE') || causeMessage.includes('UNIQUE'))
    && (message.includes('venues.slug') || causeMessage.includes('venues.slug'))
}

export default defineEventHandler(async (event) => {
  const venueId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(venueId)) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_VENUE_ID', message: 'Venue ID is invalid.' })
  }

  const result = await readValidatedBody(event, body => updateVenueSchema.safeParse({ ...body, id: venueId }))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  try {
    await venueService.update(result.data)
    const response = await venueService.getDetail(venueId)
    if (!response) {
      throw apiError({ status: 404, statusText: 'Not Found', code: 'VENUE_NOT_FOUND', message: 'Venue not found.' })
    }
    return success(response)
  }
  catch (error: unknown) {
    if (isVenueSlugConflict(error)) {
      throw apiError({
        status: 409,
        statusText: 'Conflict',
        code: 'VENUE_SLUG_EXISTS',
        message: 'A venue with this slug already exists.',
        fieldErrors: { slug: ['A venue with this slug already exists.'] },
      })
    }

    throw error
  }
})
