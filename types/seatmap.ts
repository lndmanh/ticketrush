import type { PublicTicketTypeSummary } from '~~/types/events'
import type { SeatPricingSource as SeatPricingSourceEnum, SeatStatus as SeatStatusEnum } from '#shared/commonEnums'

export type SeatMapStatus = `${SeatStatusEnum}`

export type SeatPricingSource = `${SeatPricingSourceEnum}`

export interface SeatMapSeat {
  id: number
  venueSeatId?: number | null
  venueSectionId?: number | null
  ticketTypeId?: number | null
  sectionKeySnapshot?: string | null
  sectionNameSnapshot: string
  sectionColorSnapshot?: string | null
  rowLabelSnapshot: string | null
  seatLabelSnapshot: string
  displayX?: number | null
  displayY?: number | null
  priceCents: number
  currency?: string
  status: SeatMapStatus
  pricingSource?: SeatPricingSource
}

export interface SeatMapTicketType {
  id?: number
  venueSectionId?: number | null
  name: string
  description?: string | null
  priceCents: number
  currency: string
  capacity: number
  color: string
}

export interface SeatMapSectionPriceSummary {
  venueSectionId: number
  sectionNameSnapshot: string
  sectionColorSnapshot: string
  priceCents: number
  currency: string
  sortOrder: number
}

export interface SeatMapSeatOverrideSummary {
  venueSeatId: number
  venueSectionId: number
  priceCents: number | null
  currency: string | null
  isDisabled: boolean
}

export interface SeatMapRow {
  label: string
  seats: SeatMapSeat[]
  columnCount: number
}

export interface SeatMapSection {
  key: string
  code: string
  name: string
  color: string
  seats: SeatMapSeat[]
  rows: SeatMapRow[]
  metrics: {
    total: number
    available: number
    locked: number
    sold: number
    unavailable: number
  }
}

export interface SeatMapInventorySummary {
  total: number
  available: number
  locked: number
  sold: number
  unavailable: number
}

export interface SeatMapLayout {
  sections: SeatMapSection[]
  inventorySummary: SeatMapInventorySummary
  sectionPriceBySectionId: Map<number, SeatMapSectionPriceSummary>
  seatOverrideBySeatId: Map<number, SeatMapSeatOverrideSummary>
  ticketTypeById: Map<number, SeatMapTicketType>
  ticketTypeBySectionId: Map<number, SeatMapTicketType>
}

export interface SeatMapSeatClickPayload {
  seat: SeatMapSeat
  section: {
    key: string
    code: string
    name: string
  }
  row: {
    label: string
  }
  selected: boolean
}

export interface SessionSeatMapSeat extends SeatMapSeat {
  venueSeatId: number | null
  venueSectionId: number | null
  ticketTypeId: number | null
  displayX: number | null
  displayY: number | null
  currency: string
}

/** Legacy-only: retained for transitional APIs while section pricing becomes primary. */
export type SessionSeatMapTicketType = PublicTicketTypeSummary

export interface SessionSeatMapResponse {
  version: number
  seats: SessionSeatMapSeat[]
  sectionPrices: SeatMapSectionPriceSummary[]
  seatOverrides: SeatMapSeatOverrideSummary[]
  ticketTypes?: SessionSeatMapTicketType[]
}
