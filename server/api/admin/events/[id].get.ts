import type { AdminEventWorkspaceDetail, AdminEventWorkspaceSession } from '~~/types/admin-events'
import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event ID is invalid.' })
  }

  const current = await eventService.getById(eventId)
  if (!current) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const detail = await eventService.getDetailBySlug(current.slug)
  if (!detail) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event details not found.' })
  }

  const venue = await venueService.getDetail(current.venueId)
  const currentVenueLayoutVersion = venue?.venue.layoutVersion
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
    pricingMode: session.pricingMode,
    currency: session.currency,
    venueLayoutVersion: session.venueLayoutVersion,
    venueSyncedAt: session.venueSyncedAt,
    venueSyncStatus: currentVenueLayoutVersion !== undefined && session.venueLayoutVersion === currentVenueLayoutVersion ? 'current' : 'stale',
    sectionPrices: session.sectionPrices.map(sectionPrice => ({
      venueSectionId: sectionPrice.venueSectionId,
      sectionNameSnapshot: sectionPrice.sectionNameSnapshot,
      sectionColorSnapshot: sectionPrice.sectionColorSnapshot,
      priceCents: sectionPrice.priceCents,
      currency: sectionPrice.currency,
      sortOrder: sectionPrice.sortOrder,
    })),
    seatOverrides: session.seatOverrides.map(seatOverride => ({
      venueSeatId: seatOverride.venueSeatId,
      venueSectionId: seatOverride.venueSectionId,
      priceCents: seatOverride.priceCents,
      currency: seatOverride.currency,
      isDisabled: seatOverride.isDisabled,
    })),
    seats: session.seats.map(seat => ({
      id: seat.id,
      venueSeatId: seat.venueSeatId,
      venueSectionId: seat.venueSectionId,
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
    primarySessionId: detail.event.primarySessionId,
    sessions,
    venue,
  }

  return success(response)
})
