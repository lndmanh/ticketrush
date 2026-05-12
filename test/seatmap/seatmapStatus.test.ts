import { describe, expect, it } from 'vitest'
import { getSeatMapStatusColor, seatMapStatusPalette } from '@/lib/seatmapStatus'
import { SeatStatus } from '#shared/commonEnums'

describe('seatmap status colors', () => {
  it('uses selected color over the underlying status', () => {
    expect(getSeatMapStatusColor(SeatStatus.Available, true)).toEqual(seatMapStatusPalette.selected)
  })

  it('uses held color for locked seats', () => {
    expect(getSeatMapStatusColor(SeatStatus.Locked, false).label).toBe('Held')
  })

  it('uses sold color for sold seats', () => {
    expect(getSeatMapStatusColor(SeatStatus.Sold, false).label).toBe('Sold')
  })
})
