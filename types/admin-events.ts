import type { EventAutosaveDraftInput, VenueLayoutSyncApplySchemaInput } from '#shared/schemas/ticketingSchema'
import type { EventStatus, PricingMode as PricingModeEnum, SeatLayoutMode, SeatStatus } from '#shared/commonEnums'
import type { DateLike } from '~~/types/events'
import type { VenueDetail } from '~~/types/venues'

export interface AutosaveDraftDetail {
  draftKey: string
  payload: EventAutosaveDraftInput['payload']
  lastSavedStep: number
  updatedAt: string | Date | null
  createdAt: string | Date | null
}

export interface AutosaveDraftSummary {
  draftKey: string
  titleSnapshot: string
  slugSnapshot: string
  venueId: number | null
  lastSavedStep: number
  updatedAt: string | Date
  createdAt: string | Date
}

export interface AutosaveDraftSaveData {
  draftKey: string
  lastSavedStep: number
  updatedAt: string | Date | null
}

export interface AutosaveDraftConvertData {
  draftKey: string
  eventId: number
}

export interface AutosaveDraftDeleteData {
  draftKey: string
}

export interface AdminEventWorkspaceEvent {
  id: number
  slug: string
  title: string
  subtitle: string | null
  description: string
  status: EventStatus
  venueId: number
  coverImage: string | null
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
}

/** Legacy-only: retained for transitional APIs while section pricing becomes primary. */
export interface AdminEventWorkspaceTicketTypeLegacy {
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

export interface AdminSessionSectionPrice {
  id?: number
  venueSectionId: number
  sectionNameSnapshot: string
  sectionColorSnapshot: string
  priceCents: number
  currency: string
  sortOrder: number
}

export interface AdminSessionSeatOverride {
  id?: number
  venueSeatId: number
  venueSectionId: number
  priceCents: number | null
  currency: string | null
  isDisabled: boolean
}

export interface VenueLayoutSyncOldSection {
  venueSectionId: number
  name: string
  color: string
  sortOrder: number
  priceCents: number
  currency: string
  rowCount: number
  seatCount: number
}

export interface VenueLayoutSyncCurrentSection {
  venueSectionId: number
  name: string
  color: string
  sortOrder: number
  rowCount: number
  seatCount: number
}

export interface VenueLayoutSyncSuggestion {
  venueSectionId: number
  sourceVenueSectionId: number | null
  confidence: 'high' | 'medium' | 'none'
  reason: 'lineage' | 'ancestor-lineage' | 'display-match' | 'new-section'
}

export interface VenueLayoutSyncPreview {
  sessionId: number
  eventId: number
  venueId: number
  sessionLayoutVersion: number
  currentLayoutVersion: number
  status: 'current' | 'stale'
  oldSections: VenueLayoutSyncOldSection[]
  currentSections: VenueLayoutSyncCurrentSection[]
  suggestions: VenueLayoutSyncSuggestion[]
  clearsSeatOverrides: boolean
}

export type VenueLayoutSyncApplyInput = VenueLayoutSyncApplySchemaInput
export type VenueLayoutSyncApplyMapping = VenueLayoutSyncApplyInput['mappings'][number]

export interface AdminEventWorkspaceSeat {
  id: number
  venueSeatId: number | null
  venueSectionId: number | null
  sectionKeySnapshot?: string | null
  sectionCodeSnapshot?: string | null
  sectionNameSnapshot: string
  sectionColorSnapshot?: string | null
  sectionGridXSnapshot?: number | null
  sectionGridYSnapshot?: number | null
  sectionGridWSnapshot?: number | null
  sectionGridHSnapshot?: number | null
  sectionSeatLayoutModeSnapshot?: SeatLayoutMode | null
  rowLabelSnapshot: string | null
  seatLabelSnapshot: string
  displayX?: number | null
  displayY?: number | null
  status: SeatStatus
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
  status: EventStatus
  startsAt: DateLike
  endsAt: DateLike | null
  salesStartAt: DateLike
  salesEndAt: DateLike
  queueEnabled: boolean
  pricingMode: PricingModeEnum
  currency: string
  venueLayoutVersion: number
  venueSyncedAt: DateLike | null
  venueSyncStatus: 'current' | 'stale'
  sectionPrices: AdminSessionSectionPrice[]
  seatOverrides: AdminSessionSeatOverride[]
  seats?: AdminEventWorkspaceSeat[]
}

export interface AdminEventWorkspaceVenue extends VenueDetail {}

export interface AdminEventWorkspaceDetail {
  venue?: AdminEventWorkspaceVenue
  event: AdminEventWorkspaceEvent
  primarySessionId: number | null
  sessions: AdminEventWorkspaceSession[]
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
