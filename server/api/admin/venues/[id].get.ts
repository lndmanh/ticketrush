import type { VenueDetail } from '~~/types/venues'
import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const venueId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Venue ID is invalid.' })
  }

  const venue = await venueService.getDetail(venueId)
  if (!venue) {
    throw createError({ statusCode: 404, statusMessage: 'Venue not found.' })
  }

  const response: VenueDetail = venue
  return success(response)
})
