import eventSessionService from '~~/server/utils/database/event-session'
import eventService from '~~/server/utils/database/event'
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
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  getTicketingSessionKey(event)

  const parent = await eventService.getById(eventId)
  if (!parent) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
  }

  const session = await eventSessionService.getDefaultSessionForEvent(eventId)
  if (!session) {
    return success({ seats: [], ticketTypes: [] })
  }

  const seatMap = await eventSessionService.getSeatMap(session.id)
  return success(mapSeatMap(seatMap))
})
