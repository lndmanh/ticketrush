import type { SeatMapLayout, SeatMapSeat, SeatMapSeatClickPayload, SeatMapStatus } from '~~/types/seatmap'
import { getSeatMapStatusColor, type SeatMapStatusColor } from '@/lib/seatmapStatus'

export interface SeatMapRenderOptions {
  seatSpacing: number
  rowSpacing: number
  sectionGap: number
}

export interface SeatMapRenderBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface SeatMapRenderSection {
  key: string
  code: string
  name: string
  color: string
  bounds: SeatMapRenderBounds
}

export interface SeatMapRenderSeat {
  key: string
  seatId: number
  x: number
  y: number
  width: number
  height: number
  cornerRadius: number
  label: string
  status: SeatMapStatus
  selected: boolean
  color: SeatMapStatusColor
  sectionKey: string
  sectionCode: string
  sectionName: string
  rowLabel: string
  source: SeatMapSeat
}

export interface SeatMapRenderModel {
  sections: SeatMapRenderSection[]
  seats: SeatMapRenderSeat[]
  bounds: SeatMapRenderBounds
}

const defaultRenderOptions: SeatMapRenderOptions = {
  seatSpacing: 30,
  rowSpacing: 32,
  sectionGap: 84,
}

const seatIconWidth = 22
const seatIconHeight = 18
const seatIconCornerRadius = 6

function createEmptyBounds(): SeatMapRenderBounds {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
}

function createBounds(points: Array<{ x: number, y: number }>): SeatMapRenderBounds {
  if (points.length === 0) {
    return createEmptyBounds()
  }

  const xs = points.map(point => point.x)
  const ys = points.map(point => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

function createBoundsFromSeats(seats: SeatMapRenderSeat[]): SeatMapRenderBounds {
  if (seats.length === 0) {
    return createEmptyBounds()
  }

  return createBounds(seats.flatMap(seat => [
    { x: seat.x - seat.width / 2, y: seat.y - seat.height / 2 },
    { x: seat.x + seat.width / 2, y: seat.y + seat.height / 2 },
  ]))
}

export function createSeatMapRenderModel(layout: SeatMapLayout, selectedSeatIds: number[], partialOptions: Partial<SeatMapRenderOptions> = {}): SeatMapRenderModel {
  const options = { ...defaultRenderOptions, ...partialOptions }
  const selectedSeatIdSet = new Set(selectedSeatIds)
  const sections: SeatMapRenderSection[] = []
  const seats: SeatMapRenderSeat[] = []
  let sectionOffsetY = 0

  for (const section of layout.sections) {
    const sectionSeats: SeatMapRenderSeat[] = []

    section.rows.forEach((row, rowIndex) => {
      row.seats.forEach((seat, seatIndex) => {
        const displayX = seat.displayX ?? seatIndex
        const displayY = seat.displayY ?? rowIndex
        const selected = selectedSeatIdSet.has(seat.id)
        const renderSeat: SeatMapRenderSeat = {
          key: `${section.key}-${seat.id}`,
          seatId: seat.id,
          x: displayX * options.seatSpacing,
          y: sectionOffsetY + displayY * options.rowSpacing,
          width: seatIconWidth,
          height: seatIconHeight,
          cornerRadius: seatIconCornerRadius,
          label: seat.seatLabelSnapshot,
          status: seat.status,
          selected,
          color: getSeatMapStatusColor(seat.status, selected),
          sectionKey: section.key,
          sectionCode: section.code,
          sectionName: section.name,
          rowLabel: row.label,
          source: seat,
        }

        sectionSeats.push(renderSeat)
        seats.push(renderSeat)
      })
    })

    const bounds = createBoundsFromSeats(sectionSeats)
    sections.push({ key: section.key, code: section.code, name: section.name, color: section.color, bounds })
    if (sectionSeats.length === 0) {
      sectionOffsetY += options.sectionGap
    }
    else {
      sectionOffsetY = bounds.maxY + options.sectionGap
    }
  }

  return { sections, seats, bounds: createBoundsFromSeats(seats) }
}

export function createSeatMapSeatClickPayload(renderSeat: SeatMapRenderSeat): SeatMapSeatClickPayload {
  return {
    seat: renderSeat.source,
    section: { key: renderSeat.sectionKey, code: renderSeat.sectionCode, name: renderSeat.sectionName },
    row: { label: renderSeat.rowLabel },
    selected: renderSeat.selected,
  }
}
