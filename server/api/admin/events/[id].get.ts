import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const current = await eventService.getById(eventId)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
  }

  const detail = await eventService.getDetailBySlug(current.slug)
  const venue = await venueService.getDetail(current.venueId)
  return success({
    ...detail,
    ticketTypes: detail?.sessions[0]?.ticketTypes ?? [],
    seats: detail?.sessions[0]?.seats ?? [],
    venue,
  })
})
