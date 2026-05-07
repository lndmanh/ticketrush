import type { AdminEventWorkspaceDetail, AdminEventWorkspaceSeat, AdminEventWorkspaceSession, AdminEventWorkspaceTicketType } from '~~/types/admin-events'
import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const current = await eventService.getById(eventId)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
  }

  const detail = await eventService.getDetailBySlug(current.slug)
  if (!detail) {
    throw createError({ statusCode: 404, statusMessage: 'Event details not found.' })
  }

  const venue = await venueService.getDetail(current.venueId)
  const sessions: AdminEventWorkspaceSession[] = detail.sessions.map(session => ({
    id: session.id,
    publicId: session.publicId,
    eventId: session.eventId,
    venueId: session.venueId,
    label: session.label,
    status: session.status,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    salesStartAt: session.salesStartAt,
    salesEndAt: session.salesEndAt,
    queueEnabled: session.queueEnabled,
    ticketTypes: session.ticketTypes.map(ticketType => ({
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
    seats: session.seats.map(seat => ({
      id: seat.id,
      sectionNameSnapshot: seat.sectionNameSnapshot,
      rowLabelSnapshot: seat.rowLabelSnapshot,
      seatLabelSnapshot: seat.seatLabelSnapshot,
      displayX: seat.displayX,
      displayY: seat.displayY,
      status: seat.status,
      priceCents: seat.priceCents,
      currency: seat.currency,
      updatedAt: seat.updatedAt,
    })),
  }))
  const ticketTypes: AdminEventWorkspaceTicketType[] = sessions[0]?.ticketTypes ?? []
  const seats: AdminEventWorkspaceSeat[] = sessions[0]?.seats ?? []
  const response: AdminEventWorkspaceDetail = {
    event: {
      id: detail.event.id,
      slug: detail.event.slug,
      title: detail.event.title,
      subtitle: detail.event.subtitle,
      description: detail.event.description,
      status: detail.event.status,
      venueId: detail.event.venueId,
      coverImage: detail.event.coverImage,
      startsAt: detail.event.startsAt,
      endsAt: detail.event.endsAt,
      salesStartAt: detail.event.salesStartAt,
      salesEndAt: detail.event.salesEndAt,
    },
    sessions,
    ticketTypes,
    seats,
    venue,
  }

  return success(response)
})
