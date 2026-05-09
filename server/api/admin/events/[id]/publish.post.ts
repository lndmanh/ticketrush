import eventService from '~~/server/utils/database/event'
import analyticsService from '~~/server/utils/ticketing/analytics'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }

  const current = await eventService.getById(eventId)
  if (!current) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const realtimeEnv = getSeatmapRealtimeEnv(event)
  const published = await eventService.publish(eventId, realtimeEnv.SEATMAP_REALTIME_ROOM)
  try {
    await analyticsService.recomputeDailyBucket(eventId)
  }
  catch (error) {
    console.error('Failed to recompute analytics bucket after publish', error)
  }
  const response: Awaited<ReturnType<typeof eventService.publish>> = published
  return success(response)
})
