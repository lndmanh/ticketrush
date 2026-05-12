import { describe, expect, it } from 'vitest'
import { getSeatMapStatusColor, seatMapStatusPalette } from '@/lib/seatmapStatus'
import { SeatStatus } from '#shared/commonEnums'

describe('seatmap status colors', () => {
  it('uses selected color over the underlying status', () => {
    expect(getSeatMapStatusColor(SeatStatus.Available, true)).toEqual(seatMapStatusPalette.selected)
  })

  it('uses held label key for locked seats', () => {
    expect(getSeatMapStatusColor(SeatStatus.Locked, false).labelKey).toBe('seatmap.status_locked')
  })

  it('uses sold label key for sold seats', () => {
    expect(getSeatMapStatusColor(SeatStatus.Sold, false).labelKey).toBe('seatmap.status_sold')
  })
})
