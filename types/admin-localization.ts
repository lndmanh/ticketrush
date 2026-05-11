import type { Locale } from '~~/i18n-constants'

export interface AdminEventTranslationSource {
  id: number
  title: string
  subtitle: string | null
  description: string
}

export interface AdminVenueTranslationSource {
  id: number
  name: string
  description: string | null
  city: string
  address: string
}

export interface AdminEventTranslationRecord {
  eventId: number
  locale: Locale
  title: string | null
  subtitle: string | null
  description: string | null
}

export interface AdminTicketTypeTranslationSource {
  id: number
  name: string
  description: string | null
  sortOrder: number
}

export interface AdminTicketTypeTranslationRecord {
  ticketTypeId: number
  locale: Locale
  name: string | null
  description: string | null
}

export interface AdminVenueTranslationRecord {
  venueId: number
  locale: Locale
  name: string | null
  description: string | null
  city: string | null
  address: string | null
}

export interface AdminEventTranslationData {
  sourceLocale: Locale
  event: AdminEventTranslationSource
  eventTranslations: AdminEventTranslationRecord[]
  ticketTypes: AdminTicketTypeTranslationSource[]
  ticketTypeTranslations: AdminTicketTypeTranslationRecord[]
}

export interface AdminVenueTranslationData {
  sourceLocale: Locale
  venue: AdminVenueTranslationSource
  translations: AdminVenueTranslationRecord[]
}
