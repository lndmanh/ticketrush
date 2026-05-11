import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { EventDetailResponse, PublicEventSessionSummary, PublicEventSummary, PublicVenueDetail } from '~~/types/events'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'
import { EventStatus } from '#shared/commonEnums'

const eventDetailQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

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
    sectionPrices: session.sectionPrices.map(sectionPrice => ({
      venueSectionId: sectionPrice.venueSectionId,
      sectionNameSnapshot: sectionPrice.sectionNameSnapshot,
      sectionColorSnapshot: sectionPrice.sectionColorSnapshot,
      priceCents: sectionPrice.priceCents,
      currency: sectionPrice.currency,
      sortOrder: sectionPrice.sortOrder,
    })),
  }
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'id')
  if (!slug) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_EVENT_ID', message: 'Event slug is required.' })
  }

  const query = await getValidatedQuery(event, rawQuery => eventDetailQuerySchema.parse(rawQuery))
  const detail = await eventService.getDetailBySlug(slug, query.locale)
  if (!detail) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const publicSessionStatuses = [EventStatus.Published, EventStatus.OnSale, EventStatus.SoldOut]
  const now = Date.now()
  const publicSessions = detail.sessions.filter((session) => {
    if (!publicSessionStatuses.includes(session.status)) {
      return false
    }

    return new Date(session.salesEndAt).getTime() >= now
  })

  const [venue, eventDto, sessions] = await Promise.all([
    venueService.getDetail(detail.event.venueId, query.locale),
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
