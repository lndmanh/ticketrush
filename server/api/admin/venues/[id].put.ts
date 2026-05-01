import { updateVenueSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const venueId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Venue ID is invalid.' })
  }

  const result = await readValidatedBody(event, body => updateVenueSchema.safeParse({ ...body, id: venueId }))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Venue update data is invalid.', data: result.error })
  }

  const venue = await venueService.update(result.data)
  return success(venue)
})
