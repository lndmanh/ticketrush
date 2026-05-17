import { createSeatHoldSchema } from '#shared/schemas/ticketingSchema'
import type { HoldData } from '~~/types/ticketing'
import eventSessionService from '~~/server/utils/database/event-session'
import holdService from '~~/server/utils/ticketing/holds'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { requireBookingSession } from '~~/server/utils/ticketing/captcha-pass'
import { EventStatus } from '#shared/commonEnums'

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  if (session.status === EventStatus.Draft || session.status === EventStatus.Cancelled) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Event session not found.' })
  }

  if (session.status !== EventStatus.Published && session.status !== EventStatus.OnSale) {
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

  const sessionKey = getTicketingSessionKey(event)
  await requireBookingSession(session.id, sessionKey)
  const userSession = await requireUserSession(event)
  const result = await readValidatedBody(event, body => createSeatHoldSchema.safeParse({ ...body, eventSessionId: session.id }))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const { SEATMAP_REALTIME_ROOM: realtimeNamespace } = getSeatmapRealtimeEnv(event)

  const holdBundle = await holdService.createHold({
    ...result.data,
    sessionKey,
  }, userSession.user.id, realtimeNamespace)
  if (!holdBundle) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'ERROR', message: 'Failed to create seat hold.' })
  }

  const response: HoldData = {
    hold: {
      publicId: holdBundle.hold.publicId,
    },
  }

  return success(response)
})
