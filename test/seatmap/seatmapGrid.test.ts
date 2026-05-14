import { describe, expect, it } from 'vitest'
import {
  createAutomaticSeatPositions,
  createDefaultSectionGridPlacement,
  createManualDuplicateSeatRow,
  defaultSectionGridHeight,
  getMaxSeatYInSection,
  findOverlappingSectionGridCells,
  getSectionGridCells,
  hasManualSeatCoordinateCollision,
  seatmapGridColumnCount,
} from '@/lib/seatmapGrid'
import type { SeatMapSeat } from '~~/types/seatmap'

describe('seatmapGrid', () => {
  it('returns the default grid dimensions', () => {
    expect(seatmapGridColumnCount).toBe(25)
    expect(defaultSectionGridHeight).toBe(4)
  })

  it('creates default section placements in a two-column flow', () => {
    expect(createDefaultSectionGridPlacement(0)).toEqual({ gridX: 0, gridY: 0, gridW: 25, gridH: 4 })
    expect(createDefaultSectionGridPlacement(1)).toEqual({ gridX: 0, gridY: 5, gridW: 12, gridH: 4 })
    expect(createDefaultSectionGridPlacement(2)).toEqual({ gridX: 13, gridY: 5, gridW: 12, gridH: 4 })
    expect(createDefaultSectionGridPlacement(3)).toEqual({ gridX: 0, gridY: 10, gridW: 12, gridH: 4 })
    expect(createDefaultSectionGridPlacement(4)).toEqual({ gridX: 13, gridY: 10, gridW: 12, gridH: 4 })
    expect(createDefaultSectionGridPlacement(5)).toEqual({ gridX: 0, gridY: 15, gridW: 12, gridH: 4 })
  })

  it('duplicates a manual row below existing rows while preserving x coordinates', () => {
    expect(createManualDuplicateSeatRow({
      label: 'B',
      sortOrder: 1,
      seats: [
        { label: '1', seatNumber: 1, x: 2, y: 1, sortOrder: 0, accessibilityLabel: '', isAccessible: false },
        { label: '2', seatNumber: 2, x: 5, y: 1, sortOrder: 1, accessibilityLabel: '', isAccessible: false },
      ],
    }, 7)).toEqual({
      label: 'B*',
      sortOrder: 1,
      seats: [
        { label: '1', seatNumber: 1, x: 2, y: 7, sortOrder: 0, accessibilityLabel: '', isAccessible: false },
        { label: '2', seatNumber: 2, x: 5, y: 7, sortOrder: 1, accessibilityLabel: '', isAccessible: false },
      ],
    })
  })

  it('finds the max seat y in a section', () => {
    expect(getMaxSeatYInSection([
      { seats: [{ y: 2 }, { y: 7 }] },
      { seats: [{ y: 5 }] },
    ])).toBe(7)
  })

  it('expands section rects into covered grid cells', () => {
    expect(getSectionGridCells({ gridX: 1, gridY: 2, gridW: 2, gridH: 3 })).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
    ])
  })

  it('finds overlapping grid cells across section rects', () => {
    expect(findOverlappingSectionGridCells([
      { gridX: 0, gridY: 0, gridW: 2, gridH: 2 },
      { gridX: 1, gridY: 1, gridW: 2, gridH: 2 },
      { gridX: 4, gridY: 4, gridW: 1, gridH: 1 },
    ])).toEqual([
      { x: 1, y: 1 },
    ])
  })

  it('detects manual seat coordinate collisions', () => {
    const seats: Pick<SeatMapSeat, 'displayX' | 'displayY'>[] = [
      { displayX: 0, displayY: 0 },
      { displayX: 1, displayY: 0 },
      { displayX: 0, displayY: 0 },
    ]

    expect(hasManualSeatCoordinateCollision(seats)).toBe(true)
    expect(hasManualSeatCoordinateCollision([
      { displayX: 0, displayY: 0 },
      { displayX: 1, displayY: 0 },
    ])).toBe(false)
  })

  it('distributes automatic seats evenly inside section bounds', () => {
    expect(createAutomaticSeatPositions({
      rows: [
        { label: 'A', seatCount: 3 },
        { label: 'B', seatCount: 3 },
      ],
      bounds: { minX: 120, minY: 80, width: 240, height: 120 },
      paddingX: 24,
      paddingY: 20,
    })).toEqual([
      { rowLabel: 'A', seatIndex: 0, x: 192, y: 127 },
      { rowLabel: 'A', seatIndex: 1, x: 240, y: 127 },
      { rowLabel: 'A', seatIndex: 2, x: 288, y: 127 },
      { rowLabel: 'B', seatIndex: 0, x: 192, y: 153 },
      { rowLabel: 'B', seatIndex: 1, x: 240, y: 153 },
      { rowLabel: 'B', seatIndex: 2, x: 288, y: 153 },
    ])
  })
})
