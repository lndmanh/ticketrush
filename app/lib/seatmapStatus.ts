import type { SeatMapStatus } from '~~/types/seatmap'
import { SeatStatus } from '#shared/commonEnums'

export interface SeatMapStatusColor {
  labelKey: string
  fill: string
  stroke: string
  text: string
  hexNumber: number
}

export type SeatMapStatusColorKey = SeatMapStatus | 'selected'

function hexToNumber(hex: string) {
  return Number.parseInt(hex.replace('#', ''), 16)
}

export const seatMapStatusPalette: Record<SeatMapStatusColorKey, SeatMapStatusColor> = {
  [SeatStatus.Available]: {
    labelKey: 'seatmap.status_available',
    fill: '#86EFAC',
    stroke: '#22C55E',
    text: '#020617',
    hexNumber: hexToNumber('#86EFAC'),
  },
  [SeatStatus.Locked]: {
    labelKey: 'seatmap.status_locked',
    fill: '#FCD34D',
    stroke: '#F59E0B',
    text: '#020617',
    hexNumber: hexToNumber('#FCD34D'),
  },
  [SeatStatus.Sold]: {
    labelKey: 'seatmap.status_sold',
    fill: '#CBD5E1',
    stroke: '#64748B',
    text: '#020617',
    hexNumber: hexToNumber('#CBD5E1'),
  },
  [SeatStatus.Unavailable]: {
    labelKey: 'seatmap.status_unavailable',
    fill: '#E5E7EB',
    stroke: '#94A3B8',
    text: '#020617',
    hexNumber: hexToNumber('#E5E7EB'),
  },
  selected: {
    labelKey: 'seatmap.status_selected',
    fill: '#0F172A',
    stroke: '#020617',
    text: '#F8FAFC',
    hexNumber: hexToNumber('#0F172A'),
  },
}

export function getSeatMapStatusColor(status: SeatMapStatus, selected: boolean) {
  return selected ? seatMapStatusPalette.selected : seatMapStatusPalette[status]
}
