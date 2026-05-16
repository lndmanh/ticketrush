import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { createCaptchaRequiredError } from '~~/server/utils/ticketing/captcha-pass'
import { BookingAccessDecision, resolveBookingAccess } from '~~/server/utils/ticketing/booking-access'
import type { EventSessionGateResponse } from '~~/types/ticketing'
import { EventStatus } from '#shared/commonEnums'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  if (session.status === EventStatus.Draft || session.status === EventStatus.Cancelled) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  const passToken = getQuery(event).pass
  const customerKey = getTicketingSessionKey(event)
  const access = await resolveBookingAccess(session.id, customerKey, typeof passToken === 'string' ? passToken : undefined)

  if (access.decision === BookingAccessDecision.Forbidden) {
    throw createCaptchaRequiredError()
  }

  const response: EventSessionGateResponse = {
    shouldQueue: access.shouldQueue,
    sessionPublicId: session.publicId,
    eventId: session.eventId,
  }

  return success(response)
})
