import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import eventSessionService from '~~/server/utils/database/event-session'
import venueService from '~~/server/utils/database/venue'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { EventSessionDetailResponse, PublicEventSessionBase, PublicEventSummary, PublicVenueDetail } from '~~/types/events'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'
import { EventStatus } from '#shared/commonEnums'

const eventSessionQuerySchema = z.object({
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

function mapSectionPrices(sectionPrices: Awaited<ReturnType<typeof eventSessionService.getSeatMap>>['sectionPrices']) {
  return sectionPrices.map(sectionPrice => ({
    venueSectionId: sectionPrice.venueSectionId,
    sectionNameSnapshot: sectionPrice.sectionNameSnapshot,
    sectionColorSnapshot: sectionPrice.sectionColorSnapshot,
    priceCents: sectionPrice.priceCents,
    currency: sectionPrice.currency,
    sortOrder: sectionPrice.sortOrder,
  }))
}

function mapSeatOverrides(seatOverrides: Awaited<ReturnType<typeof eventSessionService.getSeatMap>>['seatOverrides']) {
  return seatOverrides.map(seatOverride => ({
    venueSeatId: seatOverride.venueSeatId,
    venueSectionId: seatOverride.venueSectionId,
    priceCents: seatOverride.priceCents,
    currency: seatOverride.currency,
    isDisabled: seatOverride.isDisabled,
  }))
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

  if (session.status === EventStatus.Draft || session.status === EventStatus.Cancelled) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  const query = await getValidatedQuery(event, rawQuery => eventSessionQuerySchema.parse(rawQuery))
  const [parent, venue, seatMap] = await Promise.all([
    eventService.getLocalizedById(session.eventId, query.locale),
    venueService.getDetail(session.venueId, query.locale),
    eventSessionService.getSeatMap(session.id),
  ])

  if (!parent) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'EVENT_NOT_FOUND', message: 'Event not found.' })
  }

  const response: EventSessionDetailResponse = {
    event: mapEvent(parent),
    session: mapSession(session),
    venue: mapVenue(venue),
    sectionPrices: mapSectionPrices(seatMap.sectionPrices),
    seatOverrides: mapSeatOverrides(seatMap.seatOverrides),
  }

  return success(response)
})
