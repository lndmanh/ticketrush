import type { PublicTicketTypeSummary } from '~~/types/events'

export type SeatMapStatus = 'available' | 'locked' | 'sold' | 'unavailable'

export interface SeatMapSeat {
  id: number
  venueSectionId?: number | null
  ticketTypeId?: number | null
  sectionNameSnapshot: string
  rowLabelSnapshot: string | null
  seatLabelSnapshot: string
  displayX?: number | null
  displayY?: number | null
  priceCents: number
  currency?: string
  status: SeatMapStatus
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
  ticketTypeById: Map<number, SeatMapTicketType>
  ticketTypeBySectionId: Map<number, SeatMapTicketType>
}

export interface SessionSeatMapSeat extends SeatMapSeat {
  venueSectionId: number | null
  ticketTypeId: number | null
  displayX: number | null
  displayY: number | null
  currency: string
}

export type SessionSeatMapTicketType = PublicTicketTypeSummary

export interface SessionSeatMapResponse {
  seats: SessionSeatMapSeat[]
  ticketTypes: SessionSeatMapTicketType[]
}
