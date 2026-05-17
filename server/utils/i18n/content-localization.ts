import type { Event, EventTranslation, TicketType, TicketTypeTranslation, Venue, VenueTranslation } from '#shared/db'
import { normalizeLocale } from '~~/shared/utils/locales'

function getTranslatedRequiredValue(translatedValue: string | null | undefined, sourceValue: string) {
  const normalizedValue = normalizeTranslationText(translatedValue)
  return normalizedValue ?? sourceValue
}

function getTranslatedOptionalValue(translatedValue: string | null | undefined, sourceValue: string | null) {
  const normalizedValue = normalizeTranslationText(translatedValue)
  return normalizedValue ?? sourceValue
}

export function normalizeTranslationText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export function resolveContentLocale(locale: string | null | undefined) {
  return normalizeLocale(locale ?? '')
}

export function localizeEvent(event: Event, translation: EventTranslation | null | undefined): Event {
  return {
    ...event,
    title: getTranslatedRequiredValue(translation?.title, event.title),
    subtitle: getTranslatedOptionalValue(translation?.subtitle, event.subtitle),
    description: getTranslatedRequiredValue(translation?.description, event.description),
  }
}

export function localizeVenue(venue: Venue, translation: VenueTranslation | null | undefined): Venue {
  return {
    ...venue,
    name: getTranslatedRequiredValue(translation?.name, venue.name),
    description: getTranslatedOptionalValue(translation?.description, venue.description),
    city: getTranslatedRequiredValue(translation?.city, venue.city),
    address: getTranslatedRequiredValue(translation?.address, venue.address),
  }
}

export function localizeTicketType(ticketType: TicketType, translation: TicketTypeTranslation | null | undefined): TicketType {
  return {
    ...ticketType,
    name: getTranslatedRequiredValue(translation?.name, ticketType.name),
    description: getTranslatedOptionalValue(translation?.description, ticketType.description),
  }
}

export function mapEventTranslationsByEventId(translations: EventTranslation[]) {
  return new Map(translations.map(translation => [translation.eventId, translation]))
}

export function mapVenueTranslationsByVenueId(translations: VenueTranslation[]) {
  return new Map(translations.map(translation => [translation.venueId, translation]))
}

export function mapTicketTypeTranslationsByTicketTypeId(translations: TicketTypeTranslation[]) {
  return new Map(translations.map(translation => [translation.ticketTypeId, translation]))
}
