import type { SessionSeatMapVersionResponse } from '~~/types/seatmap'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { requireSeatBookingAccess } from '~~/server/utils/ticketing/booking-access'
import holdService from '~~/server/utils/ticketing/holds'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'
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

  await requireSeatBookingAccess(session.id, getTicketingSessionKey(event))

  const realtimeNamespace = getSeatmapRealtimeEnv(event).SEATMAP_REALTIME_ROOM
  await holdService.expireStaleHoldsForSession(session.id, realtimeNamespace)

  const state = await eventSessionService.getSeatmapVersionState(session.id)
  if (!state || state.status === EventStatus.Draft || state.status === EventStatus.Cancelled) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  const response: SessionSeatMapVersionResponse = {
    sessionPublicId: session.publicId,
    version: state.seatmapVersion,
  }

  return success(response)
})
