import { createVenueSchema } from '#shared/schemas/ticketingSchema'
import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createVenueSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Venue data is invalid.', data: result.error })
  }

  const venue = await venueService.create(result.data)
  return success(venue)
})
