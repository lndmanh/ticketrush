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

  it('uses light status fills with black labels for non-selected seats', () => {
    expect(seatMapStatusPalette[SeatStatus.Available]).toMatchObject({
      fill: '#86EFAC',
      stroke: '#22C55E',
      text: '#020617',
    })
    expect(seatMapStatusPalette[SeatStatus.Locked]).toMatchObject({
      fill: '#FCD34D',
      stroke: '#F59E0B',
      text: '#020617',
    })
    expect(seatMapStatusPalette[SeatStatus.Sold]).toMatchObject({
      fill: '#CBD5E1',
      stroke: '#64748B',
      text: '#020617',
    })
    expect(seatMapStatusPalette[SeatStatus.Unavailable]).toMatchObject({
      fill: '#E5E7EB',
      stroke: '#94A3B8',
      text: '#020617',
    })
  })
})
