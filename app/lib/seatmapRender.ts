import type { SeatMapLayout, SeatMapSeat, SeatMapSeatClickPayload, SeatMapStatus } from '~~/types/seatmap'
import { SeatLayoutMode } from '#shared/commonEnums'
import { createAutomaticSeatPositions } from '@/lib/seatmapGrid'
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
  contentBounds: SeatMapRenderBounds
  bounds: SeatMapRenderBounds
  rowLabels: SeatMapRenderRowLabel[]
  availability: SeatMapRenderAvailabilityLabel
}

export interface SeatMapRenderRowLabel {
  label: string
  x: number
  y: number
}

export interface SeatMapRenderAvailabilityLabel {
  label: string
  x: number
  y: number
}

export interface SeatMapRenderStage {
  bounds: SeatMapRenderBounds
  label: string
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
  stage: SeatMapRenderStage
  sections: SeatMapRenderSection[]
  seats: SeatMapRenderSeat[]
  bounds: SeatMapRenderBounds
}

const defaultRenderOptions: SeatMapRenderOptions = {
  seatSpacing: 56,
  rowSpacing: 48,
  sectionGap: 84,
}

const seatIconWidth = 48
const seatIconHeight = 40
const seatIconCornerRadius = 8
const gridCellWidth = 72
const gridCellHeight = 72
const stageBandHeight = 64
const stageGap = 46

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

function mergeBounds(a: SeatMapRenderBounds, b: SeatMapRenderBounds): SeatMapRenderBounds {
  if (a.width === 0 && a.height === 0) {
    return b
  }

  if (b.width === 0 && b.height === 0) {
    return a
  }

  const minX = Math.min(a.minX, b.minX)
  const minY = Math.min(a.minY, b.minY)
  const maxX = Math.max(a.maxX, b.maxX)
  const maxY = Math.max(a.maxY, b.maxY)

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function createSeatMapRenderModel(layout: SeatMapLayout, selectedSeatIds: number[], partialOptions: Partial<SeatMapRenderOptions> = {}): SeatMapRenderModel {
  const options = { ...defaultRenderOptions, ...partialOptions }
  const selectedSeatIdSet = new Set(selectedSeatIds)
  const sections: SeatMapRenderSection[] = []
  const seats: SeatMapRenderSeat[] = []
  const stage: SeatMapRenderStage = {
    label: 'Stage',
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: stageBandHeight, width: 0, height: stageBandHeight },
  }

  for (const section of layout.sections) {
    const sectionMinX = section.gridX * gridCellWidth
    const sectionMinY = stageBandHeight + stageGap + (section.gridY * gridCellHeight)
    const sectionMaxX = sectionMinX + (section.gridW * gridCellWidth)
    const sectionMaxY = sectionMinY + (section.gridH * gridCellHeight)
    const sectionGridBounds = {
      minX: sectionMinX,
      minY: sectionMinY,
      maxX: sectionMaxX,
      maxY: sectionMaxY,
      width: sectionMaxX - sectionMinX,
      height: sectionMaxY - sectionMinY,
    }
    const automaticPositions = section.seatLayoutMode === SeatLayoutMode.Automatic
      ? createAutomaticSeatPositions({
          rows: section.rows.map(row => ({ label: row.label, seatCount: row.seats.length })),
          bounds: {
            minX: sectionMinX,
            minY: sectionMinY,
            width: section.gridW * gridCellWidth,
            height: section.gridH * gridCellHeight,
          },
          paddingX: seatSpacingPadding(options.seatSpacing),
          paddingY: seatSpacingPadding(options.rowSpacing),
        })
      : []
    const automaticSeatPositionsByRow = new Map<string, Array<{ x: number, y: number }>>()
    for (const position of automaticPositions) {
      const rowPositions = automaticSeatPositionsByRow.get(position.rowLabel)
      const nextPosition = { x: position.x, y: position.y }
      if (rowPositions) {
        rowPositions.push(nextPosition)
      }
      else {
        automaticSeatPositionsByRow.set(position.rowLabel, [nextPosition])
      }
    }

    const rowLabels: SeatMapRenderRowLabel[] = []
    section.rows.forEach((row, rowIndex) => {
      let rowLeftmostSeatX: number | null = null
      let rowMinSeatY: number | null = null
      let rowMaxSeatY: number | null = null
      row.seats.forEach((seat, seatIndex) => {
        const automaticSeatPositions = automaticSeatPositionsByRow.get(row.label)
        const automaticSeatPosition = automaticSeatPositions?.[seatIndex]
        const displayX = automaticSeatPosition?.x ?? seat.displayX ?? seatIndex
        const displayY = automaticSeatPosition?.y ?? seat.displayY ?? rowIndex
        const x = section.seatLayoutMode === SeatLayoutMode.Manual
          ? sectionMinX + seatSpacingPadding(options.seatSpacing) + (displayX * options.seatSpacing)
          : displayX
        const y = section.seatLayoutMode === SeatLayoutMode.Manual
          ? sectionMinY + seatSpacingPadding(options.rowSpacing) + (displayY * options.rowSpacing)
          : displayY
        const selected = selectedSeatIdSet.has(seat.id)
        const renderSeat: SeatMapRenderSeat = {
          key: `${section.key}-${seat.id}`,
          seatId: seat.id,
          x,
          y,
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

        seats.push(renderSeat)
        rowLeftmostSeatX = rowLeftmostSeatX === null ? x : Math.min(rowLeftmostSeatX, x)
        rowMinSeatY = rowMinSeatY === null ? y : Math.min(rowMinSeatY, y)
        rowMaxSeatY = rowMaxSeatY === null ? y : Math.max(rowMaxSeatY, y)
      })

      if (rowLeftmostSeatX !== null && rowMinSeatY !== null && rowMaxSeatY !== null) {
        const labelX = Math.max(sectionGridBounds.minX, rowLeftmostSeatX - seatSpacingPadding(options.seatSpacing) - 8)
        rowLabels.push({ label: row.label, x: labelX, y: rowMinSeatY + ((rowMaxSeatY - rowMinSeatY) / 2) })
      }
    })

    const sectionSeatBounds = createBoundsFromSeats(seats.filter(seat => seat.sectionKey === section.key))
    const labelBounds = rowLabels.length > 0
      ? createBounds(rowLabels.map(label => ({ x: label.x, y: label.y })))
      : createEmptyBounds()
    const contentBounds = mergeBounds(mergeBounds(sectionGridBounds, sectionSeatBounds), labelBounds)
    const availability = {
      label: `${section.metrics.available} / ${section.metrics.total} available`,
      x: contentBounds.maxX,
      y: contentBounds.minY - 10,
    }
    const availabilityBounds = createBounds([{ x: availability.x, y: availability.y }])
    sections.push({ key: section.key, code: section.code, name: section.name, color: section.color, contentBounds, bounds: mergeBounds(contentBounds, availabilityBounds), rowLabels, availability })
  }

  const seatBounds = createBoundsFromSeats(seats)
  const sectionBounds = sections.reduce((acc, section) => mergeBounds(acc, section.bounds), createEmptyBounds())
  const contentBounds = createBounds([
    { x: seatBounds.minX, y: seatBounds.minY },
    { x: seatBounds.maxX, y: seatBounds.maxY },
    ...sections.flatMap(section => ([
      { x: section.bounds.minX, y: section.bounds.minY },
      { x: section.bounds.maxX, y: section.bounds.maxY },
    ])),
  ])
  const stageBounds = contentBounds.width === 0 && contentBounds.height === 0
    ? { minX: 0, minY: 0, maxX: 0, maxY: stageBandHeight, width: 0, height: stageBandHeight }
    : { minX: contentBounds.minX, minY: 0, maxX: contentBounds.maxX, maxY: stageBandHeight, width: contentBounds.width, height: stageBandHeight }
  stage.bounds = stageBounds
  const bounds = createBounds([
    { x: stage.bounds.minX, y: stage.bounds.minY },
    { x: stage.bounds.maxX, y: stage.bounds.maxY },
    { x: seatBounds.minX, y: seatBounds.minY },
    { x: seatBounds.maxX, y: seatBounds.maxY },
    ...sections.flatMap(section => ([
      { x: section.bounds.minX, y: section.bounds.minY },
      { x: section.bounds.maxX, y: section.bounds.maxY },
    ])),
  ])

  return { stage, sections, seats, bounds }
}

function seatSpacingPadding(spacing: number) {
  return Math.max(Math.round(spacing * 0.5), 1)
}

export function createSeatMapSeatClickPayload(renderSeat: SeatMapRenderSeat): SeatMapSeatClickPayload {
  return {
    seat: renderSeat.source,
    section: { key: renderSeat.sectionKey, code: renderSeat.sectionCode, name: renderSeat.sectionName },
    row: { label: renderSeat.rowLabel },
    selected: renderSeat.selected,
  }
}
