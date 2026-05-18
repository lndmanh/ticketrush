export interface SeatSelectionRefreshInput {
  selectedSeatIds: number[]
  previewSeatIds: number[]
  availableSeatIds: ReadonlySet<number>
  preserveUnavailableSelection: boolean
}

export interface SeatSelectionRefreshResult {
  selectedSeatIds: number[]
  previewSeatIds: number[]
  changed: boolean
}

export function resolveSeatSelectionAfterRefresh(input: SeatSelectionRefreshInput): SeatSelectionRefreshResult {
  if (input.preserveUnavailableSelection) {
    return {
      selectedSeatIds: input.selectedSeatIds,
      previewSeatIds: input.previewSeatIds,
      changed: false,
    }
  }

  const selectedSeatIds = input.selectedSeatIds.filter(seatId => input.availableSeatIds.has(seatId))
  const previewSeatIds = input.previewSeatIds.filter(seatId => input.availableSeatIds.has(seatId))

  return {
    selectedSeatIds,
    previewSeatIds,
    changed: selectedSeatIds.length !== input.selectedSeatIds.length || previewSeatIds.length !== input.previewSeatIds.length,
  }
}
