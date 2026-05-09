import { createVenueSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { VenueDetail } from '~~/types/venues'

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
  const result = await readValidatedBody(event, body => createVenueSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  try {
    const venue = await venueService.create(result.data)
    const response: VenueDetail = venue
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
