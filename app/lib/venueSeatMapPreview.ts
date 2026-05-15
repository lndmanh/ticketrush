import type { SeatMapSeat } from '~~/types/seatmap'
import type { SeatLayoutMode } from '#shared/commonEnums'
import { SeatPricingSource, SeatStatus } from '#shared/commonEnums'

interface PreviewVenueSeat {
  id?: number
  label: string
  seatNumber: number
  x: number
  y: number
  sortOrder: number
  accessibilityLabel?: string | null
  isAccessible: boolean
}

interface PreviewVenueRow {
  id?: number
  label: string
  sortOrder: number
  seats: PreviewVenueSeat[]
}

interface PreviewVenueSection {
  id?: number
  code: string
  name: string
  color: string
  sortOrder: number
  gridX: number
  gridY: number
  gridW: number
  gridH: number
  seatLayoutMode: SeatLayoutMode
  rows: PreviewVenueRow[]
}

function hashPreviewSeatKey(value: string) {
  let hash = 2166136261

  for (const character of value) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  }

  return hash
}

function createPreviewSeatId(sectionKey: string, section: PreviewVenueSection, row: PreviewVenueRow, seat: PreviewVenueSeat) {
  const key = [
    sectionKey,
    section.id ?? '',
    section.code,
    section.name,
    row.id ?? '',
    row.label,
    seat.label,
    seat.seatNumber,
    seat.x,
    seat.y,
    seat.sortOrder,
  ].join('|')
  const hash = hashPreviewSeatKey(key)

  return -Math.max(hash, 1)
}

export function createVenueSeatMapPreviewSeats(sections: PreviewVenueSection[]): SeatMapSeat[] {
  return sections.flatMap((section, sectionIndex) => section.rows.flatMap(row => row.seats.map((seat) => {
    const sectionKey = `preview-section-${section.id ?? `${sectionIndex}-${section.code}-${section.name}`}`
    const seatId = seat.id ?? createPreviewSeatId(sectionKey, section, row, seat)

    return {
      id: seatId,
      venueSeatId: seat.id ?? null,
      venueSectionId: section.id ?? null,
      ticketTypeId: null,
      sectionKeySnapshot: sectionKey,
      sectionCodeSnapshot: section.code,
      sectionNameSnapshot: section.name,
      sectionColorSnapshot: section.color,
      sectionGridXSnapshot: section.gridX,
      sectionGridYSnapshot: section.gridY,
      sectionGridWSnapshot: section.gridW,
      sectionGridHSnapshot: section.gridH,
      sectionSeatLayoutModeSnapshot: section.seatLayoutMode,
      rowLabelSnapshot: row.label,
      seatLabelSnapshot: seat.label,
      displayX: seat.x,
      displayY: seat.y,
      status: SeatStatus.Available,
      priceCents: 0,
      currency: 'VND',
      pricingSource: SeatPricingSource.Section,
    }
  })))
}
