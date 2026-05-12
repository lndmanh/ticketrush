import { describe, expect, it } from 'vitest'
import { createVenueSeatMapPreviewSeats } from '@/lib/venueSeatMapPreview'
import { SeatPricingSource, SeatStatus } from '#shared/commonEnums'

describe('createVenueSeatMapPreviewSeats', () => {
  it('converts venue layout sections into available seatmap seats with stable ids', () => {
    const seats = createVenueSeatMapPreviewSeats([
      {
        id: 5,
        code: 'ORCH',
        name: 'Orchestra',
        color: '#64748B',
        sortOrder: 0,
        rows: [
          {
            id: 9,
            label: 'A',
            sortOrder: 0,
            seats: [
              {
                id: 11,
                label: '1',
                seatNumber: 1,
                x: 4,
                y: 2,
                sortOrder: 0,
                accessibilityLabel: null,
                isAccessible: false,
              },
            ],
          },
        ],
      },
    ])

    expect(seats).toEqual([
      {
        id: 11,
        venueSeatId: 11,
        venueSectionId: 5,
        ticketTypeId: null,
        sectionNameSnapshot: 'Orchestra',
        sectionColorSnapshot: '#64748B',
        sectionKeySnapshot: 'preview-section-5',
        rowLabelSnapshot: 'A',
        seatLabelSnapshot: '1',
        displayX: 4,
        displayY: 2,
        status: SeatStatus.Available,
        priceCents: 0,
        currency: 'VND',
        pricingSource: SeatPricingSource.Section,
      },
    ])
  })

  it('creates stable negative preview ids for unsaved seats', () => {
    const originalSeats = createVenueSeatMapPreviewSeats([
      {
        code: 'TMP',
        name: 'Draft section',
        color: '#64748B',
        sortOrder: 0,
        rows: [
          {
            label: 'A',
            sortOrder: 0,
            seats: [
              {
                label: '1',
                seatNumber: 1,
                x: 0,
                y: 0,
                sortOrder: 0,
                accessibilityLabel: '',
                isAccessible: false,
              },
            ],
          },
        ],
      },
    ])

    const insertedSeats = createVenueSeatMapPreviewSeats([
      {
        code: 'NEW',
        name: 'Inserted section',
        color: '#64748B',
        sortOrder: 0,
        rows: [
          {
            label: 'Z',
            sortOrder: 0,
            seats: [
              {
                label: '9',
                seatNumber: 9,
                x: 9,
                y: 9,
                sortOrder: 9,
                accessibilityLabel: null,
                isAccessible: false,
              },
            ],
          },
        ],
      },
      {
        code: 'TMP',
        name: 'Draft section',
        color: '#64748B',
        sortOrder: 1,
        rows: [
          {
            label: 'A',
            sortOrder: 0,
            seats: [
              {
                label: '1',
                seatNumber: 1,
                x: 0,
                y: 0,
                sortOrder: 0,
                accessibilityLabel: '',
                isAccessible: false,
              },
            ],
          },
        ],
      },
    ])

    expect(originalSeats[0]?.id).toBeLessThan(0)
    expect(originalSeats[0]?.venueSeatId).toBeNull()
    expect(originalSeats[0]?.venueSectionId).toBeNull()
    expect(originalSeats[0]?.sectionColorSnapshot).toBe('#64748B')
    expect(originalSeats[0]?.sectionKeySnapshot).toBe('preview-section-0-TMP-Draft section')
    expect(insertedSeats[1]?.id).not.toBe(originalSeats[0]?.id)
    expect(insertedSeats[1]?.sectionKeySnapshot).toBe('preview-section-1-TMP-Draft section')
  })

  it('creates distinct preview ids for identical unsaved seats in different draft sections', () => {
    const seats = createVenueSeatMapPreviewSeats([
      {
        code: 'DRAFT',
        name: 'Draft section',
        color: '#64748B',
        sortOrder: 0,
        rows: [
          {
            label: 'A',
            sortOrder: 0,
            seats: [
              {
                label: '1',
                seatNumber: 1,
                x: 0,
                y: 0,
                sortOrder: 0,
                accessibilityLabel: null,
                isAccessible: false,
              },
            ],
          },
        ],
      },
      {
        code: 'DRAFT',
        name: 'Draft section',
        color: '#94A3B8',
        sortOrder: 1,
        rows: [
          {
            label: 'A',
            sortOrder: 0,
            seats: [
              {
                label: '1',
                seatNumber: 1,
                x: 0,
                y: 0,
                sortOrder: 0,
                accessibilityLabel: null,
                isAccessible: false,
              },
            ],
          },
        ],
      },
    ])

    expect(seats[0]?.id).toBeLessThan(0)
    expect(seats[1]?.id).toBeLessThan(0)
    expect(seats[0]?.id).not.toBe(seats[1]?.id)
    expect(seats[0]?.sectionKeySnapshot).not.toBe(seats[1]?.sectionKeySnapshot)
  })
})
