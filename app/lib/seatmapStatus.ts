import type { SeatMapStatus } from '~~/types/seatmap'
import { SeatStatus } from '#shared/commonEnums'

export interface SeatMapStatusColor {
  label: string
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
    label: 'Available',
    fill: '#22C55E',
    stroke: '#15803D',
    text: '#052E16',
    hexNumber: hexToNumber('#22C55E'),
  },
  [SeatStatus.Locked]: {
    label: 'Held',
    fill: '#F59E0B',
    stroke: '#B45309',
    text: '#451A03',
    hexNumber: hexToNumber('#F59E0B'),
  },
  [SeatStatus.Sold]: {
    label: 'Sold',
    fill: '#475569',
    stroke: '#1E293B',
    text: '#F8FAFC',
    hexNumber: hexToNumber('#475569'),
  },
  [SeatStatus.Unavailable]: {
    label: 'Unavailable',
    fill: '#CBD5E1',
    stroke: '#94A3B8',
    text: '#334155',
    hexNumber: hexToNumber('#CBD5E1'),
  },
  selected: {
    label: 'Selected',
    fill: '#0F172A',
    stroke: '#020617',
    text: '#F8FAFC',
    hexNumber: hexToNumber('#0F172A'),
  },
}

export function getSeatMapStatusColor(status: SeatMapStatus, selected: boolean) {
  return selected ? seatMapStatusPalette.selected : seatMapStatusPalette[status]
}
