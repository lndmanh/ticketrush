import eventSessionService from '~~/server/utils/database/event-session'
import { success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

function mapSeatMap(seatMap: Awaited<ReturnType<typeof eventSessionService.getSeatMap>>) {
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
      status: seat.status,
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
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found.' })
  }

  if (session.status === 'draft' || session.status === 'cancelled') {
    throw createError({ statusCode: 404, statusMessage: 'Session not found.' })
  }

  getTicketingSessionKey(event)

  const seatMap = await eventSessionService.getSeatMap(session.id)
  return success(mapSeatMap(seatMap))
})
