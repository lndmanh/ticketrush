import type { SeatMapLayout, SeatMapRow, SeatMapSeat, SeatMapSeatOverrideSummary, SeatMapSectionPriceSummary, SeatMapTicketType } from '~~/types/seatmap'
import { getDisplayDateLocale } from '~~/shared/utils/locales'
import { SeatStatus } from '#shared/commonEnums'

const fallbackSectionColors = ['#111827', '#0F766E', '#1D4ED8', '#B45309', '#BE123C']

export function buildSectionCode(sectionName: string, index: number) {
  const code = sectionName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')

  return code || `S${index + 1}`
}

export function colorToRgb(color: string) {
  const normalized = color.trim().replace('#', '')

  if (normalized.length === 3) {
    const [red, green, blue] = normalized.split('')
    if (!red || !green || !blue) {
      return null
    }

    const expanded = `${red}${red}${green}${green}${blue}${blue}`
    const parsed = Number.parseInt(expanded, 16)

    if (Number.isNaN(parsed)) {
      return null
    }

    return `${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}`
  }

  if (normalized.length !== 6) {
    return null
  }

  const parsed = Number.parseInt(normalized, 16)
  if (Number.isNaN(parsed)) {
    return null
  }

  return `${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}`
}

export function getTintStyle(color: string, borderAlpha: number, backgroundAlpha: number) {
  const rgb = colorToRgb(color)
  if (!rgb) {
    return {}
  }

  return {
    borderColor: `rgba(${rgb}, ${borderAlpha})`,
    backgroundImage: `linear-gradient(180deg, rgba(${rgb}, ${backgroundAlpha}), rgba(${rgb}, 0.04) 58%, rgba(255,255,255,0) 100%)`,
    boxShadow: `0 28px 60px -52px rgba(${rgb}, 0.42)`,
  }
}

export function buildSeatMapLayout(
  seats: SeatMapSeat[],
  ticketTypes: SeatMapTicketType[],
  sectionPrices: SeatMapSectionPriceSummary[] = [],
  seatOverrides: SeatMapSeatOverrideSummary[] = [],
  options: { fallbackSectionName: string, fallbackRowLabel: string } = { fallbackSectionName: 'Floor', fallbackRowLabel: 'GA' },
): SeatMapLayout {
  const ticketTypeById = new Map(
    ticketTypes
      .filter((ticketType): ticketType is SeatMapTicketType & { id: number } => typeof ticketType.id === 'number')
      .map(ticketType => [ticketType.id, ticketType]),
  )

  const ticketTypeBySectionId = new Map(
    ticketTypes
      .filter((ticketType): ticketType is SeatMapTicketType & { venueSectionId: number } => typeof ticketType.venueSectionId === 'number')
      .map(ticketType => [ticketType.venueSectionId, ticketType]),
  )

  const sectionPriceBySectionId = new Map(sectionPrices.map(sectionPrice => [sectionPrice.venueSectionId, sectionPrice]))
  const seatOverrideBySeatId = new Map(seatOverrides.map(seatOverride => [seatOverride.venueSeatId, seatOverride]))

  const sectionMap = new Map<string, { name: string, seats: SeatMapSeat[] }>()

  for (const seat of seats) {
    const sectionName = seat.sectionNameSnapshot || options.fallbackSectionName
    const key = typeof seat.venueSectionId === 'number'
      ? `section-${seat.venueSectionId}`
      : `name-${sectionName}`
    const currentSection = sectionMap.get(key) ?? { name: sectionName, seats: [] }
    currentSection.seats.push(seat)
    sectionMap.set(key, currentSection)
  }

  const sections = Array.from(sectionMap.entries()).map(([sectionKey, sectionEntry], sectionIndex) => {
    const sectionSeats = sectionEntry.seats
    const rowMap = new Map<string, SeatMapSeat[]>()

    for (const seat of sectionSeats) {
      const rowKey = seat.rowLabelSnapshot || options.fallbackRowLabel
      const currentRowSeats = rowMap.get(rowKey) ?? []
      currentRowSeats.push(seat)
      rowMap.set(rowKey, currentRowSeats)
    }

    const rows = Array.from(rowMap.entries())
      .map(([rowLabel, rowSeats]) => {
        const sortedSeats = [...rowSeats].sort((left, right) => {
          if (left.displayX !== right.displayX) {
            return (left.displayX ?? Number.MAX_SAFE_INTEGER) - (right.displayX ?? Number.MAX_SAFE_INTEGER)
          }

          return left.seatLabelSnapshot.localeCompare(right.seatLabelSnapshot, undefined, { numeric: true })
        })
        const normalizedSeats = sortedSeats.map((seat, seatIndex) => ({
          ...seat,
          displayX: seatIndex,
        }))

        return {
          label: rowLabel,
          seats: normalizedSeats,
          columnCount: Math.max(normalizedSeats.length, 1),
        }
      })
      .sort((left, right) => {
        const leftY = Math.min(...left.seats.map(seat => seat.displayY ?? Number.MAX_SAFE_INTEGER))
        const rightY = Math.min(...right.seats.map(seat => seat.displayY ?? Number.MAX_SAFE_INTEGER))

        if (leftY !== rightY) {
          return leftY - rightY
        }

        return left.label.localeCompare(right.label, undefined, { numeric: true })
      })

    const normalizedSectionSeats = rows.flatMap(row => row.seats)

    const sectionSeat = sectionSeats.find(seat => typeof seat.venueSectionId === 'number')
    const sectionPrice = typeof sectionSeat?.venueSectionId === 'number'
      ? sectionPriceBySectionId.get(sectionSeat.venueSectionId)
      : undefined
    const sectionTicketType = typeof sectionSeat?.venueSectionId === 'number'
      ? ticketTypeBySectionId.get(sectionSeat.venueSectionId)
      : undefined

    return {
      key: sectionKey,
      code: buildSectionCode(sectionEntry.name, sectionIndex),
      name: sectionEntry.name,
      color: sectionTicketType?.color || sectionPrice?.sectionColorSnapshot || fallbackSectionColors[sectionIndex % fallbackSectionColors.length] || fallbackSectionColors[0],
      seats: normalizedSectionSeats,
      rows,
      metrics: {
        total: sectionSeats.length,
        available: sectionSeats.filter(seat => seat.status === SeatStatus.Available).length,
        locked: sectionSeats.filter(seat => seat.status === SeatStatus.Locked).length,
        sold: sectionSeats.filter(seat => seat.status === SeatStatus.Sold).length,
        unavailable: sectionSeats.filter(seat => seat.status === SeatStatus.Unavailable).length,
      },
    }
  })

  return {
    sections,
    inventorySummary: {
      total: seats.length,
      available: seats.filter(seat => seat.status === SeatStatus.Available).length,
      locked: seats.filter(seat => seat.status === SeatStatus.Locked).length,
      sold: seats.filter(seat => seat.status === SeatStatus.Sold).length,
      unavailable: seats.filter(seat => seat.status === SeatStatus.Unavailable).length,
    },
    sectionPriceBySectionId,
    seatOverrideBySeatId,
    ticketTypeById,
    ticketTypeBySectionId,
  }
}

export function getRowStyle(row: SeatMapRow) {
  return {
    gridTemplateColumns: `repeat(${row.columnCount}, minmax(0, 2.85rem))`,
  }
}

export function formatSeatMapCurrency(value: number, currency = 'VND', locale = 'vi') {
  return `${Intl.NumberFormat(getDisplayDateLocale(locale)).format(value / 100)} ${currency}`
}
