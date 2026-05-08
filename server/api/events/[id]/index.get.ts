import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { EventDetailResponse, PublicEventSessionSummary, PublicEventSummary, PublicVenueDetail } from '~~/types/events'

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

function mapSession(session: NonNullable<Awaited<ReturnType<typeof eventService.getDetailBySlug>>>['sessions'][number]): PublicEventSessionSummary {
  return {
    publicId: session.publicId,
    label: session.label,
    status: session.status,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    salesStartAt: session.salesStartAt,
    salesEndAt: session.salesEndAt,
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
  }
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'id')
  if (!slug) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event slug is required.' })
  }

  const detail = await eventService.getDetailBySlug(slug)
  if (!detail) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const publicSessionStatuses = ['published', 'on_sale', 'sold_out']
  const now = Date.now()
  const publicSessions = detail.sessions.filter((session) => {
    if (!publicSessionStatuses.includes(session.status)) {
      return false
    }

    return new Date(session.salesEndAt).getTime() >= now
  })

  const [venue, eventDto, sessions] = await Promise.all([
    venueService.getDetail(detail.event.venueId),
    Promise.resolve(mapEvent(detail.event)),
    Promise.resolve(publicSessions.map(mapSession)),
  ])

  const response: EventDetailResponse = {
    event: eventDto,
    sessions,
    venue: mapVenue(venue),
  }

  return success(response)
})
