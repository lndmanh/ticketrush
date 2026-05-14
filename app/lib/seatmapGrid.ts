import type { SeatMapSeat } from '~~/types/seatmap'

export const seatmapGridColumnCount = 25
export const defaultSectionGridHeight = 4

export interface SeatmapBoundsInput {
  minX: number
  minY: number
  width: number
  height: number
}

export interface AutomaticSeatRowInput {
  label: string
  seatCount: number
}

export interface AutomaticSeatPositionOptions {
  rows: AutomaticSeatRowInput[]
  bounds: SeatmapBoundsInput
  paddingX: number
  paddingY: number
}

export interface AutomaticSeatPosition {
  rowLabel: string
  seatIndex: number
  x: number
  y: number
}

export interface SectionGridPlacement {
  gridX: number
  gridY: number
  gridW: number
  gridH: number
}

export interface SectionGridCell {
  x: number
  y: number
}

export interface SeatRowDuplicateInput {
  label: string
  sortOrder: number
  seats: Array<{
    label: string
    seatNumber: number
    x: number
    y: number
    sortOrder: number
    accessibilityLabel?: string | null
    isAccessible: boolean
  }>
}

function getCellKey(cell: SectionGridCell) {
  return `${cell.x}:${cell.y}`
}

export function createDefaultSectionGridPlacement(sectionIndex: number): SectionGridPlacement {
  if (sectionIndex === 0) {
    return { gridX: 0, gridY: 0, gridW: 25, gridH: 4 }
  }

  if (sectionIndex === 1) {
    return { gridX: 0, gridY: 5, gridW: 12, gridH: 4 }
  }

  if (sectionIndex === 2) {
    return { gridX: 13, gridY: 5, gridW: 12, gridH: 4 }
  }

  const rowIndex = Math.floor((sectionIndex - 3) / 2)
  const isLeftColumn = sectionIndex % 2 === 1

  return {
    gridX: isLeftColumn ? 0 : 13,
    gridY: 10 + (rowIndex * 5),
    gridW: 12,
    gridH: 4,
  }
}

export function getMaxSeatYInSection(rows: Array<{ seats: Array<{ y: number }> }>) {
  let maxY = 0

  for (const row of rows) {
    for (const seat of row.seats) {
      if (seat.y > maxY) {
        maxY = seat.y
      }
    }
  }

  return maxY
}

export function createManualDuplicateSeatRow(row: SeatRowDuplicateInput, nextY: number) {
  return {
    label: `${row.label}*`,
    sortOrder: row.sortOrder,
    seats: row.seats.map((seat, seatIndex) => ({
      label: seat.label,
      seatNumber: seat.seatNumber,
      x: seat.x,
      y: nextY,
      sortOrder: seatIndex,
      accessibilityLabel: seat.accessibilityLabel ?? '',
      isAccessible: seat.isAccessible,
    })),
  }
}

export function getSectionGridCells(rect: SectionGridPlacement): SectionGridCell[] {
  const cells: SectionGridCell[] = []

  for (let y = rect.gridY; y < rect.gridY + rect.gridH; y += 1) {
    for (let x = rect.gridX; x < rect.gridX + rect.gridW; x += 1) {
      cells.push({ x, y })
    }
  }

  return cells
}

export function findOverlappingSectionGridCells(rects: SectionGridPlacement[]): SectionGridCell[] {
  const cellCounts = new Map<string, { cell: SectionGridCell, count: number }>()

  for (const rect of rects) {
    for (const cell of getSectionGridCells(rect)) {
      const key = getCellKey(cell)
      const current = cellCounts.get(key)

      if (current) {
        current.count += 1
        continue
      }

      cellCounts.set(key, { cell, count: 1 })
    }
  }

  return Array.from(cellCounts.values())
    .filter(entry => entry.count > 1)
    .map(entry => entry.cell)
    .sort((left, right) => (left.y - right.y) || (left.x - right.x))
}

export function hasManualSeatCoordinateCollision(seats: Pick<SeatMapSeat, 'displayX' | 'displayY'>[]): boolean {
  const seen = new Set<string>()

  for (const seat of seats) {
    if (typeof seat.displayX !== 'number' || typeof seat.displayY !== 'number') {
      continue
    }

    const key = `${seat.displayX}:${seat.displayY}`
    if (seen.has(key)) {
      return true
    }

    seen.add(key)
  }

  return false
}

function getDistributedCoordinate(start: number, size: number, padding: number, index: number, count: number) {
  const innerStart = start + padding
  const innerSize = size - (padding * 2)

  if (count <= 1) {
    return Math.round(innerStart + (innerSize / 2))
  }

  return Math.round(innerStart + ((innerSize / (count + 1)) * (index + 1)))
}

export function createAutomaticSeatPositions(options: AutomaticSeatPositionOptions): AutomaticSeatPosition[] {
  return options.rows.flatMap((row, rowIndex) => {
    const y = getDistributedCoordinate(options.bounds.minY, options.bounds.height, options.paddingY, rowIndex, options.rows.length)

    return Array.from({ length: row.seatCount }, (_, seatIndex) => ({
      rowLabel: row.label,
      seatIndex,
      x: getDistributedCoordinate(options.bounds.minX, options.bounds.width, options.paddingX, seatIndex, row.seatCount),
      y,
    }))
  })
}
