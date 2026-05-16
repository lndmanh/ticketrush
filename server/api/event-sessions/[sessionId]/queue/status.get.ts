import type { QueueState } from '~~/types/ticketing'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { refreshQueueStatusForSession } from '~~/server/utils/ticketing/queue-status'
import { requireCaptchaPassOrQueueRecord } from '~~/server/utils/ticketing/captcha-pass'

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
  await requireCaptchaPassOrQueueRecord(session.id, customerKey)
  const response: QueueState | null = await refreshQueueStatusForSession(session.id, customerKey)
  return success(response)
})
