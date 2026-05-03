import type { DateLike } from '~~/types/events'
import type { VenueDetail } from '~~/types/venues'

export interface AdminEventWorkspaceEvent {
  id: number
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
}

export interface AdminEventWorkspaceTicketType {
  id?: number
  venueSectionId?: number | null
  name: string
  description?: string | null
  priceCents: number
  currency: string
  capacity: number
  color: string
  isReservedSeating: boolean
  sortOrder: number
}

export interface AdminEventWorkspaceSeat {
  id: number
  sectionNameSnapshot: string
  rowLabelSnapshot: string | null
  seatLabelSnapshot: string
  displayX?: number | null
  displayY?: number | null
  status: string
  priceCents: number
  currency: string
  updatedAt?: DateLike
}

export interface AdminEventWorkspaceSession {
  id: number
  publicId: string
  eventId: number
  venueId: number
  label: string
  status: string
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
  queueEnabled: boolean
  ticketTypes: AdminEventWorkspaceTicketType[]
  seats: AdminEventWorkspaceSeat[]
}

export interface AdminEventWorkspaceVenue extends VenueDetail {}

export interface AdminEventWorkspaceDetail {
  venue?: AdminEventWorkspaceVenue
  event: AdminEventWorkspaceEvent
  sessions: AdminEventWorkspaceSession[]
  ticketTypes: AdminEventWorkspaceTicketType[]
  seats: AdminEventWorkspaceSeat[]
}

export interface AdminEventWorkspaceDashboard {
  revenueCents: number
  soldSeatsCount: number
  availableSeatsCount: number
  activeHoldsCount: number
  queueWaitingCount: number
  queueAdmittedCount: number
  occupancyRate: number
  salesBySection: Record<string, { sold: number, revenueCents: number }>
  ageDistribution: Record<string, number>
  genderDistribution: Record<string, number>
  recentOrders: Array<{
    id: number
    customerName: string | null
    customerEmail: string | null
    amountCents: number
    confirmedAt: DateLike | null
  }>
}

export interface AdminEventWorkspaceOps {
  totals: {
    ordersCount: number
    ticketsCount: number
    activeHoldsCount: number
    queueEntriesCount: number
  }
  recentOrders: Array<{
    id: number
    customerName: string | null
    customerEmail: string | null
    amountCents: number
    confirmedAt: DateLike | null
    seatLabels: string[]
    ticketLabels: string[]
  }>
  recentTickets: Array<{
    id: number
    attendeeName: string
    attendeeEmail: string
    status: string
    issuedAt: DateLike
    checkedInAt: DateLike | null
    customerName: string | null
    customerEmail: string | null
    seatLabel: string | null
    sectionLabel: string | null
    rowLabel: string | null
  }>
  activeHolds: Array<{
    id: number
    publicId: string
    status: string
    expiresAt: DateLike
    seatCount: number
    seatLabels: string[]
  }>
  queueFeed: Array<{
    id: number
    customerKey: string
    status: string
    admittedAt: DateLike | null
    expiresAt: DateLike | null
    createdAt: DateLike
  }>
  seatActivity: AdminEventWorkspaceSeat[]
}

export interface UseAdminEventWorkspaceOptions {
  poll?: boolean
  intervalMs?: number
  includeOps?: boolean
}
