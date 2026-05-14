import type { VenueRowDraftInput, VenueSeatDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import { SeatLayoutMode } from '#shared/commonEnums'
import { createDefaultSectionGridPlacement, getSectionGridCells } from '@/lib/seatmapGrid'

export interface VenueLayoutPresetSectionPlacement {
  gridX: number
  gridY: number
  gridW: number
  gridH: number
}

export interface VenueLayoutPresetSection extends VenueSectionDraftInput {
  placement: VenueLayoutPresetSectionPlacement
}

export interface VenueLayoutPreset {
  id: string
  name: string
  description: string
  sections: VenueLayoutPresetSection[]
}

function nextRowLabel(index: number) {
  return String.fromCharCode(65 + index)
}

function createSeat(index: number): VenueSeatDraftInput {
  const seatNumber = index + 1

  return {
    label: String(seatNumber),
    seatNumber,
    x: index,
    y: 0,
    sortOrder: index,
    accessibilityLabel: '',
    isAccessible: false,
  }
}

export function createRow(index: number, seatCount = 8): VenueRowDraftInput {
  return {
    label: nextRowLabel(index),
    sortOrder: index,
    seats: Array.from({ length: seatCount }, (_, seatIndex) => ({
      ...createSeat(seatIndex),
      y: index,
    })),
  }
}

export function createSectionBlueprint(
  code: string,
  name: string,
  color: string,
  rowCount: number,
  seatsPerRow: number,
  sectionIndex: number,
  placement = createDefaultSectionGridPlacement(sectionIndex),
): VenueLayoutPresetSection {
  return {
    code,
    name,
    color,
    sortOrder: sectionIndex,
    gridX: placement.gridX,
    gridY: placement.gridY,
    gridW: placement.gridW,
    gridH: placement.gridH,
    seatLayoutMode: SeatLayoutMode.Automatic,
    rows: Array.from({ length: rowCount }, (_, rowIndex) => createRow(rowIndex, seatsPerRow)),
    placement,
  }
}

export const venueLayoutPresets: VenueLayoutPreset[] = [
  {
    id: 'club',
    name: 'Club floor',
    description: 'Compact premium room with a front VIP block and tighter side sections.',
    sections: [
      createSectionBlueprint('VIP', 'Front VIP', '#7C3AED', 4, 8, 0, { gridX: 0, gridY: 0, gridW: 25, gridH: 4 }),
      createSectionBlueprint('MID', 'Middle floor', '#2563EB', 6, 10, 1, { gridX: 0, gridY: 5, gridW: 12, gridH: 4 }),
      createSectionBlueprint('SIDE', 'Side riser', '#F97316', 5, 6, 2, { gridX: 13, gridY: 5, gridW: 12, gridH: 4 }),
    ],
  },
  {
    id: 'hall',
    name: 'Concert hall',
    description: 'Balanced hall layout with wider main sections for seated launches.',
    sections: [
      createSectionBlueprint('A', 'Orchestra', '#E11D48', 7, 12, 0, { gridX: 0, gridY: 0, gridW: 25, gridH: 4 }),
      createSectionBlueprint('B', 'Center', '#0F766E', 8, 14, 1, { gridX: 0, gridY: 5, gridW: 12, gridH: 4 }),
      createSectionBlueprint('C', 'Rear', '#2563EB', 6, 12, 2, { gridX: 13, gridY: 5, gridW: 12, gridH: 4 }),
    ],
  },
  {
    id: 'theater',
    name: 'Theater split',
    description: 'Three-zone theater with denser center coverage and lighter balcony capacity.',
    sections: [
      createSectionBlueprint('PRM', 'Premium center', '#DC2626', 5, 10, 0, { gridX: 0, gridY: 0, gridW: 25, gridH: 4 }),
      createSectionBlueprint('STD', 'Standard bowl', '#7C2D12', 7, 11, 1, { gridX: 0, gridY: 5, gridW: 12, gridH: 4 }),
      createSectionBlueprint('BAL', 'Balcony', '#4338CA', 4, 9, 2, { gridX: 13, gridY: 5, gridW: 12, gridH: 4 }),
      createSectionBlueprint('VIP2', 'Box seats', '#16A34A', 3, 6, 3, { gridX: 6, gridY: 10, gridW: 13, gridH: 4 }),
    ],
  },
  {
    id: 'festival',
    name: 'Festival tiers',
    description: 'Asymmetric layout mixing full-width, split, and offset lounge sections.',
    sections: [
      createSectionBlueprint('GA', 'General admission', '#1D4ED8', 3, 16, 0, { gridX: 0, gridY: 0, gridW: 25, gridH: 4 }),
      createSectionBlueprint('LEFT', 'Left terrace', '#B45309', 4, 7, 1, { gridX: 0, gridY: 5, gridW: 8, gridH: 4 }),
      createSectionBlueprint('CENTER', 'Center terrace', '#059669', 4, 9, 2, { gridX: 9, gridY: 5, gridW: 8, gridH: 4 }),
      createSectionBlueprint('RIGHT', 'Right terrace', '#BE123C', 4, 7, 3, { gridX: 18, gridY: 5, gridW: 7, gridH: 4 }),
    ],
  },
]

export function getVenueLayoutPresetSeatCount(preset: VenueLayoutPreset) {
  return preset.sections.reduce((total, section) => total + section.rows.reduce((sectionTotal, row) => sectionTotal + row.seats.length, 0), 0)
}

export function getVenueLayoutPresetSummary(preset: VenueLayoutPreset) {
  const sectionCount = preset.sections.length
  const seatCount = getVenueLayoutPresetSeatCount(preset)

  return `${sectionCount} sections · ${seatCount} seats`
}

export function getVenueLayoutPresetCompactSummary(preset: VenueLayoutPreset) {
  return preset.sections
    .map(section => `${section.name}: ${section.rows.length}×${section.rows[0]?.seats.length ?? 0} @ ${section.gridX},${section.gridY}`)
    .join(' · ')
}

export function getVenueLayoutPresetGridCells(preset: VenueLayoutPreset) {
  return preset.sections.flatMap(section => getSectionGridCells(section.placement))
}

export function getVenueLayoutPresetSections(preset: VenueLayoutPreset): VenueSectionDraftInput[] {
  return preset.sections.map(({ placement: _placement, ...section }) => section)
}
