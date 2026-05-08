import { updateVenueSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { VenueDetail } from '~~/types/venues'

export default defineEventHandler(async (event) => {
  const venueId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(venueId)) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_VENUE_ID', message: 'Venue ID is invalid.' })
  }

  const result = await readValidatedBody(event, body => updateVenueSchema.safeParse({ ...body, id: venueId }))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const venue = await venueService.update(result.data)
  const response: VenueDetail = venue
  return success(response)
})
