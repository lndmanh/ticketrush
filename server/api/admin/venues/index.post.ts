import { createVenueSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { VenueDetail } from '~~/types/venues'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createVenueSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const venue = await venueService.create(result.data)
  const response: VenueDetail = venue
  return success(response)
})
