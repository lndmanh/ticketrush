import eventService from '~~/server/utils/database/event'
import eventSessionService from '~~/server/utils/database/event-session'
import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { EventSessionDetailResponse, PublicEventSessionBase, PublicEventSummary, PublicVenueDetail } from '~~/types/events'

function mapVenue(venueDetail: Awaited<ReturnType<typeof venueService.getDetail>>): PublicVenueDetail | null {
  if (!venueDetail) {
    return null
  }

  return {
    venue: {
      publicId: venueDetail.venue.publicId,
      slug: venueDetail.venue.slug,
      name: venueDetail.venue.name,
      description: venueDetail.venue.description,
      city: venueDetail.venue.city,
      country: venueDetail.venue.country,
      address: venueDetail.venue.address,
      capacity: venueDetail.venue.capacity,
      coverImage: venueDetail.venue.coverImage,
    },
  }
}

function mapEvent(event: Awaited<ReturnType<typeof eventService.getById>>): PublicEventSummary | null {
  if (!event) {
    return null
  }

  return {
    publicId: event.publicId,
    slug: event.slug,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    status: event.status,
    coverImage: event.coverImage,
  }
}

function mapSession(session: Awaited<ReturnType<typeof eventSessionService.getByPublicId>>): PublicEventSessionBase | null {
  if (!session) {
    return null
  }

  return {
    publicId: session.publicId,
    label: session.label,
    status: session.status,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    salesStartAt: session.salesStartAt,
    salesEndAt: session.salesEndAt,
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

  const [parent, venue, seatMap] = await Promise.all([
    eventService.getById(session.eventId),
    venueService.getDetail(session.venueId),
    eventSessionService.getSeatMap(session.id),
  ])

  if (!parent) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const response: EventSessionDetailResponse = {
    event: mapEvent(parent),
    session: mapSession(session),
    venue: mapVenue(venue),
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

  return success(response)
})
