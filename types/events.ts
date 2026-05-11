import type { EventCatalogDateFilter as EventCatalogDateFilterEnum, EventCatalogSort as EventCatalogSortEnum, EventCatalogStatusFilter as EventCatalogStatusFilterEnum } from '#shared/commonEnums'

export type DateLike = string | Date

export interface PublicEventSummary {
  publicId: string
  slug: string
  title: string
  subtitle: string | null
  description: string
  status: string
  coverImage: string | null
}

export interface PublicVenueSummary {
  publicId: string
  slug: string
  name: string
  description: string | null
  city: string
  country: string
  address: string
  capacity: number
  coverImage: string | null
}

export interface PublicVenueDetail {
  venue: PublicVenueSummary
}

export interface PublicTicketTypeSummary {
  id: number
  venueSectionId: number | null
  name: string
  description: string | null
  priceCents: number
  currency: string
  capacity: number
  color: string
  isReservedSeating: boolean
  sortOrder: number
}

export interface PublicSessionSectionPriceSummary {
  venueSectionId: number
  sectionNameSnapshot: string
  sectionColorSnapshot: string
  priceCents: number
  currency: string
  sortOrder: number
}

export interface PublicSessionSeatOverrideSummary {
  venueSeatId: number
  venueSectionId: number
  priceCents: number | null
  currency: string | null
  isDisabled: boolean
}

export interface PublicEventSessionBase {
  publicId: string
  label: string
  status: string
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
}

export interface PublicEventSessionSummary extends PublicEventSessionBase {
  sectionPrices: PublicSessionSectionPriceSummary[]
  seatOverrides?: PublicSessionSeatOverrideSummary[]
  ticketTypes?: PublicTicketTypeSummary[]
}

export interface EventDetailResponse {
  event: PublicEventSummary | null
  sessions: PublicEventSessionSummary[]
  venue: PublicVenueDetail | null
}

export interface EventSessionDetailResponse {
  event: PublicEventSummary | null
  session: PublicEventSessionBase | null
  venue: PublicVenueDetail | null
  sectionPrices: PublicSessionSectionPriceSummary[]
  seatOverrides: PublicSessionSeatOverrideSummary[]
  ticketTypes?: PublicTicketTypeSummary[]
}

export interface EventSearchApiSession {
  startsAt: DateLike
  label: string
}

export interface EventSearchApiItem {
  id: string
  title: string
  subtitle: string | null
  content: string
  slug: string
  venueName: string | null
  venueCity: string | null
  sessions: EventSearchApiSession[]
}

export type EventCatalogPublicStatus = `${Exclude<EventCatalogStatusFilterEnum, EventCatalogStatusFilterEnum.All>}`

export type EventCatalogStatusFilter = `${EventCatalogStatusFilterEnum}`

export type EventCatalogDateFilter = `${EventCatalogDateFilterEnum}`

export type EventCatalogSort = `${EventCatalogSortEnum}`

export interface EventCatalogQueryOptions {
  locale: string
  q: string
  location: string
  status: EventCatalogStatusFilter
  country: string
  city: string
  area: string
  venue: string
  date: EventCatalogDateFilter | string
  sort: EventCatalogSort
  page: number
  pageSize: number
}

export interface EventCatalogLocationVenueOption {
  slug: string
  name: string
  city: string
  country: string
  address: string
}

export interface EventCatalogLocationOptions {
  countries: string[]
  cities: string[]
  areas: string[]
  venues: EventCatalogLocationVenueOption[]
}

export interface EventCatalogVenue {
  id: number
  publicId: string
  slug: string
  name: string
  description: string | null
  city: string
  country: string
  address: string
  capacity: number
  coverImage: string | null
}

export interface EventCatalogSession {
  publicId: string
  label: string
  status: string
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
}

export interface EventCatalogItem {
  id: number
  publicId: string
  slug: string
  title: string
  subtitle: string | null
  description: string
  status: string
  venueId: number
  coverImage: string | null
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
  publishedAt: DateLike | null
  createdAt: DateLike | null
  venue: EventCatalogVenue | null
  sessions: EventCatalogSession[]
}

export interface EventCatalogResult {
  items: EventCatalogItem[]
  totalItems: number
}
