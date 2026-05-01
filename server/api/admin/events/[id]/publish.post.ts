import eventService from '~~/server/utils/database/event'
import analyticsService from '~~/server/utils/ticketing/analytics'
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

  const published = await eventService.publish(eventId)
  try {
    await analyticsService.recomputeDailyBucket(eventId)
  } catch (error) {
    console.error('Failed to recompute analytics bucket after publish', error)
  }
  return success(published)
})
