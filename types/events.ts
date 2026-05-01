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
  ticketTypes: PublicTicketTypeSummary[]
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
  ticketTypes: PublicTicketTypeSummary[]
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
