import type { Venue } from '#shared/db'

export interface VenueDetailSeat {
  id: number
  label: string
  seatNumber: number
  x: number
  y: number
  sortOrder: number
  accessibilityLabel: string | null
  isAccessible: boolean
}

export interface VenueDetailRow {
  id: number
  label: string
  sortOrder: number
  seats: VenueDetailSeat[]
}

export interface VenueDetailSection {
  id: number
  code: string
  name: string
  color: string
  sortOrder: number
  rows: VenueDetailRow[]
}

export interface VenueDetail {
  venue: Venue
  sections: VenueDetailSection[]
}

export interface VenueSectionOption {
  id: number
  name: string
  color: string
}
