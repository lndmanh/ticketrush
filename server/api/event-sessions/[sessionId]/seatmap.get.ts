import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'
import holdService from '~~/server/utils/ticketing/holds'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import type { SeatMapStatus, SessionSeatMapResponse } from '~~/types/seatmap'

function toSeatMapStatus(status: string): SeatMapStatus {
  switch (status) {
    case 'available':
    case 'locked':
    case 'sold':
    case 'unavailable':
      return status
    default:
      return 'unavailable'
  }
}

function mapSeatMap(seatMap: Awaited<ReturnType<typeof eventSessionService.getSeatMap>>): SessionSeatMapResponse {
  return {
    seats: seatMap.seats.map(seat => ({
      id: seat.id,
      venueSectionId: seat.venueSectionId,
      ticketTypeId: seat.ticketTypeId,
      sectionNameSnapshot: seat.sectionNameSnapshot,
      rowLabelSnapshot: seat.rowLabelSnapshot,
      seatLabelSnapshot: seat.seatLabelSnapshot,
      displayX: seat.displayX,
      displayY: seat.displayY,
      priceCents: seat.priceCents,
      currency: seat.currency,
      status: toSeatMapStatus(seat.status),
    })),
    ticketTypes: seatMap.ticketTypes.map(ticketType => ({
      id: ticketType.id,
      venueSectionId: ticketType.venueSectionId,
      name: ticketType.name,
      description: ticketType.description,
      priceCents: ticketType.priceCents,
      currency: ticketType.currency,
      capacity: ticketType.capacity,
      color: ticketType.color,
      isReservedSeating: ticketType.isReservedSeating,
      sortOrder: ticketType.sortOrder,
    })),
  }
}

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  if (session.status === 'draft' || session.status === 'cancelled') {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  getTicketingSessionKey(event)
  await holdService.expireStaleHolds()

  const seatMap = await eventSessionService.getSeatMap(session.id)
  const response: SessionSeatMapResponse = mapSeatMap(seatMap)
  return success(response)
})
