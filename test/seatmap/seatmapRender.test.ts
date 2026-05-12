import { describe, expect, it } from 'vitest'
import { buildSeatMapLayout } from '@/lib/seatmapLayout'
import { createSeatMapRenderModel, createSeatMapSeatClickPayload } from '@/lib/seatmapRender'
import { SeatStatus } from '#shared/commonEnums'
import type { SeatMapSection, SeatMapSeat } from '~~/types/seatmap'

function createSeat(id: number, displayX: number, displayY: number): SeatMapSeat {
  return {
    id,
    venueSeatId: id,
    venueSectionId: 88,
    ticketTypeId: null,
    sectionNameSnapshot: 'Balcony',
    rowLabelSnapshot: 'B',
    seatLabelSnapshot: `B${id}`,
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

    expect(model.seats.map(seat => seat.x)).toEqual([0, 72])
    expect(model.seats[1]?.selected).toBe(true)
    expect(model.bounds.width).toBe(94)
  })

  it('creates icon-inclusive bounds for a single seat', () => {
    const layout = buildSeatMapLayout([createSeat(1, 0, 0)], [])

    const model = createSeatMapRenderModel(layout, [])
    const seat = model.seats[0]

    expect(seat).toBeDefined()

    if (seat) {
      expect(seat.width).toBe(22)
      expect(seat.height).toBe(18)
      expect(model.bounds.width).toBe(22)
      expect(model.bounds.height).toBe(18)
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

    expect(model.sections[2]?.bounds.minY).toBeGreaterThan(model.sections[0]?.bounds.maxY ?? 0)
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
