import { describe, expect, it } from 'vitest'
import { buildSeatMapLayout } from '@/lib/seatmapLayout'
import { createSeatMapRenderModel, createSeatMapSeatClickPayload } from '@/lib/seatmapRender'
import { SeatStatus, SeatLayoutMode } from '#shared/commonEnums'
import type { SeatMapSection, SeatMapSeat } from '~~/types/seatmap'

function createSeat(id: number, displayX: number, displayY: number, rowLabel = 'B'): SeatMapSeat {
  return {
    id,
    venueSeatId: id,
    venueSectionId: 88,
    ticketTypeId: null,
    sectionNameSnapshot: 'Balcony',
    rowLabelSnapshot: rowLabel,
    seatLabelSnapshot: `${rowLabel}${id}`,
    displayX,
    displayY,
    priceCents: 100000,
    currency: 'VND',
    status: SeatStatus.Available,
  }
}

describe('createSeatMapRenderModel', () => {
  it('converts layout seats into render coordinates while preserving gaps', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0),
      createSeat(2, 3, 0),
    ], [])

    const model = createSeatMapRenderModel(layout, [2], { seatSpacing: 24, rowSpacing: 28, sectionGap: 72 })

    expect(model.seats.map(seat => seat.x)).toEqual([12, 84])
    expect(model.seats[1]?.selected).toBe(true)
    expect(model.sections[0]?.bounds.minX).toBe(0)
    expect(model.sections[0]?.bounds.minY).toBe(68)
    expect(model.bounds.height).toBeGreaterThan(68)
  })

  it('spaces manual seats using grid units', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0),
      createSeat(2, 3, 0),
    ], [])

    const model = createSeatMapRenderModel(layout, [], { seatSpacing: 24, rowSpacing: 28 })

    expect(model.seats.map(seat => seat.x)).toEqual([12, 84])
    expect(model.seats.map(seat => seat.y)).toEqual([82, 82])
  })

  it('creates icon-inclusive bounds for a single seat', () => {
    const layout = buildSeatMapLayout([createSeat(1, 0, 0)], [])

    const model = createSeatMapRenderModel(layout, [])
    const seat = model.seats[0]

    expect(seat).toBeDefined()

    if (seat) {
      expect(seat.width).toBe(22)
      expect(seat.height).toBe(18)
      expect(model.bounds.width).toBeGreaterThan(22)
      expect(model.bounds.height).toBeGreaterThan(18)
    }
  })

  it('keeps later sections below empty sections', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0),
      createSeat(2, 0, 0),
    ], [])

    const emptySection: SeatMapSection = {
      key: 'empty',
      code: 'EMP',
      name: 'Empty',
      color: '#64748B',
      gridX: 0,
      gridY: 0,
      gridW: 25,
      gridH: 4,
      seatLayoutMode: SeatLayoutMode.Manual,
      seats: [],
      rows: [],
      metrics: {
        total: 0,
        available: 0,
        locked: 0,
        sold: 0,
        unavailable: 0,
      },
    }

    const model = createSeatMapRenderModel({
      ...layout,
      sections: [layout.sections[0], emptySection, layout.sections[0]],
    }, [])

    expect(model.sections[2]?.bounds.minY).toBe(68)
  })

  it('uses automatic positioning within section bounds', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0),
      createSeat(2, 0, 0),
    ], [])

    const model = createSeatMapRenderModel({
      ...layout,
      sections: [{
        ...layout.sections[0],
        seatLayoutMode: SeatLayoutMode.Automatic,
      }],
    }, [])

    const sectionBounds = model.sections[0]?.bounds
    expect(sectionBounds).toBeDefined()

    if (sectionBounds) {
      expect(model.seats.every(seat => seat.x >= sectionBounds.minX && seat.x <= sectionBounds.maxX)).toBe(true)
      expect(model.seats.every(seat => seat.y >= sectionBounds.minY && seat.y <= sectionBounds.maxY)).toBe(true)
    }
  })

  it('keeps stage geometry aligned with the model width', () => {
    const layout = buildSeatMapLayout([createSeat(1, 0, 0)], [])
    const model = createSeatMapRenderModel(layout, [])

    expect(model.stage.label).toBe('Stage')
    expect(model.stage.bounds.width).toBe(model.bounds.width)
    expect(model.stage.bounds.maxX).toBe(model.bounds.width)
  })

  it('keeps row labels in the gutter without breaking stage alignment', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0, 'A'),
      createSeat(2, 1, 0, 'A'),
    ], [])

    const model = createSeatMapRenderModel({
      ...layout,
      sections: [{
        ...layout.sections[0],
        gridW: 1,
        gridH: 1,
      }],
    }, [])

    expect(model.sections[0]?.rowLabels[0]?.x ?? 0).toBeGreaterThanOrEqual(0)
    expect(model.sections[0]?.rowLabels[0]?.x ?? 0).toBeLessThan(model.seats[0]?.x ?? 0)
    expect(model.stage.bounds.width).toBe(model.bounds.width)
    expect(model.stage.bounds.maxX).toBe(model.bounds.width)
  })

  it('keeps row labels left of the first seat with tighter spacing', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0, 'A'),
      createSeat(2, 1, 0, 'A'),
    ], [])

    const model = createSeatMapRenderModel(layout, [], { seatSpacing: 24, rowSpacing: 28 })

    expect(model.sections[0]?.rowLabels[0]?.x ?? 0).toBe(0)
    expect(model.sections[0]?.rowLabels[0]?.x ?? 0).toBeLessThan(model.seats[0]?.x ?? 0)
  })

  it('includes manual seats outside the section grid in section bounds', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0),
      createSeat(2, 2, 1),
    ], [])

    const model = createSeatMapRenderModel({
      ...layout,
      sections: [{
        ...layout.sections[0],
        gridW: 1,
        gridH: 1,
      }],
    }, [], { seatSpacing: 24, rowSpacing: 28 })
    const sectionBounds = model.sections[0]?.bounds
    const seat = model.seats[1]

    expect(sectionBounds).toBeDefined()
    expect(seat).toBeDefined()

    if (sectionBounds && seat) {
      expect(seat.x).toBe(60)
      expect(seat.y).toBe(110)
      expect(sectionBounds.maxX).toBeGreaterThan(60)
      expect(sectionBounds.maxY).toBeGreaterThan(110)
    }
  })

  it('creates one row label per rendered row and a section availability badge', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0, 'A'),
      createSeat(2, 4, 2, 'A'),
      createSeat(3, 1, 1, 'B'),
      createSeat(4, 3, 4, 'B'),
    ], [])

    const model = createSeatMapRenderModel(layout, [])
    const section = model.sections[0]

    expect(section).toBeDefined()

    if (section) {
      const rowASeats = model.seats.filter(seat => seat.rowLabel === 'A')
      const rowBSeats = model.seats.filter(seat => seat.rowLabel === 'B')
      const rowALeftmostSeat = Math.min(...rowASeats.map(seat => seat.x))
      const rowBLeftmostSeat = Math.min(...rowBSeats.map(seat => seat.x))
      const rowACenterY = Math.min(...rowASeats.map(seat => seat.y)) + ((Math.max(...rowASeats.map(seat => seat.y)) - Math.min(...rowASeats.map(seat => seat.y))) / 2)
      const rowBCenterY = Math.min(...rowBSeats.map(seat => seat.y)) + ((Math.max(...rowBSeats.map(seat => seat.y)) - Math.min(...rowBSeats.map(seat => seat.y))) / 2)

      expect(section.rowLabels).toHaveLength(2)
      expect(section.rowLabels.map(rowLabel => rowLabel.label)).toEqual(['A', 'B'])
      expect(section.rowLabels[0]?.x).toBeLessThan(rowALeftmostSeat)
      expect(section.rowLabels[0]?.x).toBe(0)
      expect(section.rowLabels[0]?.y).toBe(rowACenterY)
      expect(section.rowLabels[1]?.x).toBeLessThan(rowBLeftmostSeat)
      expect(section.rowLabels[1]?.x).toBeGreaterThanOrEqual(0)
      expect(section.rowLabels[1]?.y).toBe(rowBCenterY)
      expect(section.availability.x).toBe(section.contentBounds.maxX)
      expect(section.availability.y).toBe(section.contentBounds.minY - 10)
      expect(section.availability.label).toBe('4 / 4 available')
      expect(section.bounds.maxX).toBe(section.availability.x)
    }
  })

  it('anchors the availability badge to the expanded section panel', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0, 'A'),
      createSeat(2, 9, 0, 'A'),
    ], [])

    const model = createSeatMapRenderModel({
      ...layout,
      sections: [{
        ...layout.sections[0],
        gridW: 1,
        gridH: 1,
      }],
    }, [])
    const section = model.sections[0]

    expect(section).toBeDefined()

    if (section) {
      const sectionGridMaxX = 0 + (1 * 72)

      expect(section.contentBounds.maxX).toBeGreaterThan(sectionGridMaxX)
      expect(section.availability.x).toBe(section.contentBounds.maxX)
      expect(section.availability.y).toBe(section.contentBounds.minY - 10)
      expect(section.bounds.maxX).toBe(section.availability.x)
    }
  })

  it('builds a full click payload for parents', () => {
    const layout = buildSeatMapLayout([createSeat(7, 2, 1)], [])
    const model = createSeatMapRenderModel(layout, [7])
    const renderSeat = model.seats[0]

    expect(renderSeat).toBeDefined()

    if (renderSeat) {
      expect(createSeatMapSeatClickPayload(renderSeat)).toEqual({
        seat: renderSeat.source,
        section: {
          key: renderSeat.sectionKey,
          code: renderSeat.sectionCode,
          name: renderSeat.sectionName,
        },
        row: {
          label: renderSeat.rowLabel,
        },
        selected: true,
      })
    }
  })
})
