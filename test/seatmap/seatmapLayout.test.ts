import { describe, expect, it } from 'vitest'
import { buildSeatMapLayout } from '@/lib/seatmapLayout'
import { SeatStatus } from '#shared/commonEnums'
import type { SeatMapSeat } from '~~/types/seatmap'

function createSeat(id: number, displayX: number | null | undefined, displayY: number): SeatMapSeat {
  return {
    id,
    venueSeatId: id,
    venueSectionId: 10,
    ticketTypeId: null,
    sectionNameSnapshot: 'Orchestra',
    rowLabelSnapshot: 'A',
    seatLabelSnapshot: String(id),
    displayX,
    displayY,
    priceCents: 100000,
    currency: 'VND',
    status: SeatStatus.Available,
  }
}

describe('buildSeatMapLayout', () => {
  it('preserves displayX gaps from venue layout seats', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 0, 0),
      createSeat(2, 3, 0),
    ], [])

    const row = layout.sections[0]?.rows[0]

    expect(row?.seats.map(seat => seat.displayX)).toEqual([0, 3])
    expect(row?.columnCount).toBe(4)
  })

  it('fills missing displayX values sequentially', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, undefined, 0),
      createSeat(2, null, 0),
    ], [])

    const row = layout.sections[0]?.rows[0]

    expect(row?.seats.map(seat => seat.displayX)).toEqual([0, 1])
    expect(row?.columnCount).toBe(2)
  })

  it('keeps sparse explicit displayX values without collision', () => {
    const layout = buildSeatMapLayout([
      createSeat(1, 1, 0),
      createSeat(2, null, 0),
      createSeat(3, undefined, 0),
      createSeat(4, 3, 0),
    ], [])

    const row = layout.sections[0]?.rows[0]

    expect(row?.seats.map(seat => seat.displayX)).toEqual([0, 1, 2, 3])
    expect(row?.seats.find(seat => seat.id === 1)?.displayX).toBe(1)
    expect(row?.seats.find(seat => seat.id === 4)?.displayX).toBe(3)
    expect(row?.columnCount).toBe(4)
  })

  it('groups unsaved same-name sections by section key snapshot', () => {
    const layout = buildSeatMapLayout([
      {
        id: -1,
        venueSeatId: null,
        venueSectionId: null,
        ticketTypeId: null,
        sectionNameSnapshot: 'Balcony',
        sectionColorSnapshot: '#EF4444',
        sectionKeySnapshot: 'preview-section-0-BAL-Balcony',
        rowLabelSnapshot: 'A',
        seatLabelSnapshot: '1',
        displayX: 0,
        displayY: 0,
        priceCents: 0,
        currency: 'VND',
        status: SeatStatus.Available,
      },
      {
        id: -2,
        venueSeatId: null,
        venueSectionId: null,
        ticketTypeId: null,
        sectionNameSnapshot: 'Balcony',
        sectionColorSnapshot: '#2563EB',
        sectionKeySnapshot: 'preview-section-1-BAL-Balcony',
        rowLabelSnapshot: 'A',
        seatLabelSnapshot: '1',
        displayX: 0,
        displayY: 0,
        priceCents: 0,
        currency: 'VND',
        status: SeatStatus.Available,
      },
    ], [])

    expect(layout.sections).toHaveLength(2)
    expect(layout.sections.map(section => section.key)).toEqual([
      'preview-section-0-BAL-Balcony',
      'preview-section-1-BAL-Balcony',
    ])
    expect(layout.sections.map(section => section.color)).toEqual(['#EF4444', '#2563EB'])
  })
})
