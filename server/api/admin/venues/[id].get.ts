import type { VenueDetail } from '~~/types/venues'
import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const venueId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(venueId)) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_VENUE_ID', message: 'Venue ID is invalid.' })
  }

  const venue = await venueService.getDetail(venueId)
  if (!venue) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'VENUE_NOT_FOUND', message: 'Venue not found.' })
  }

  const response: VenueDetail = venue
  return success(response)
})
