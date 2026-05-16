import { bookingCaptchaPassSchema } from '#shared/schemas/ticketingSchema'
import { EventStatus } from '#shared/commonEnums'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { BOOKING_SESSION_TTL_SECONDS, createBookingSession } from '~~/server/utils/ticketing/captcha-pass'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import type { BookingCaptchaPassResponse } from '~~/types/ticketing'

function isBookableStatus(status: EventStatus) {
  return status === EventStatus.Published || status === EventStatus.OnSale
}

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is required.' })
  }

  const result = await readValidatedBody(event, body => bookingCaptchaPassSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid captcha request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  if (!isBookableStatus(session.status)) {
    throw apiError({ status: 409, statusText: 'Conflict', code: 'SESSION_NOT_BOOKABLE', message: 'This session is not available for booking.' })
  }

  const now = Date.now()
  const salesStartAt = new Date(session.salesStartAt).getTime()
  const salesEndAt = new Date(session.salesEndAt).getTime()
  if (salesStartAt > now || salesEndAt < now) {
    throw apiError({ status: 409, statusText: 'Conflict', code: 'SESSION_NOT_BOOKABLE', message: 'This session is not available for booking.' })
  }

  const sectionPrices = await eventSessionService.listSessionSectionPrices(session.id)
  if (sectionPrices.length === 0) {
    throw apiError({ status: 409, statusText: 'Conflict', code: 'SESSION_NOT_BOOKABLE', message: 'This session is not available for booking.' })
  }

  const tokenValidation = await verifyTurnstileToken(result.data['cf-turnstile-response'])
  if (!tokenValidation.success) {
    throw apiError({ status: 403, statusText: 'Forbidden', code: 'CAPTCHA_FAILED', message: 'Captcha verification failed. Please try again.' })
  }

  await createBookingSession(session.id, getTicketingSessionKey(event))

  const response: BookingCaptchaPassResponse = {
    sessionPublicId: session.publicId,
    expiresInSeconds: BOOKING_SESSION_TTL_SECONDS,
  }

  return success(response)
})
