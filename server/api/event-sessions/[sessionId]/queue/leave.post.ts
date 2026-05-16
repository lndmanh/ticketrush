import eventSessionService from '~~/server/utils/database/event-session'
import queueService from '~~/server/utils/ticketing/queue'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { requireBookingSessionOrQueueEntry } from '~~/server/utils/ticketing/captcha-pass'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const customerKey = getTicketingSessionKey(event)
  await requireBookingSessionOrQueueEntry(session.id, customerKey)
  const result = await queueService.leaveQueue(session.id, customerKey)
  const response: Awaited<ReturnType<typeof queueService.leaveQueue>> = result
  return success(response)
})
