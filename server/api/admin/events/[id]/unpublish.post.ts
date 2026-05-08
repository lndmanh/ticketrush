import eventService from '~~/server/utils/database/event'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(eventId)) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }

  const unpublished = await eventService.unpublish(eventId)
  const response: Awaited<ReturnType<typeof eventService.unpublish>> = unpublished
  return success(response)
})
