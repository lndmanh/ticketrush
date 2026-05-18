import { describe, expect, it } from 'vitest'
import { resolveSeatSelectionAfterRefresh } from '@/lib/seatSelectionRefresh'

describe('resolveSeatSelectionAfterRefresh', () => {
  it('keeps selected seats while checkout submission is in progress', () => {
    const result = resolveSeatSelectionAfterRefresh({
      selectedSeatIds: [1, 2],
      previewSeatIds: [3],
      availableSeatIds: new Set([4, 5]),
      preserveUnavailableSelection: true,
    })

    expect(result).toEqual({
      selectedSeatIds: [1, 2],
      previewSeatIds: [3],
      changed: false,
    })
  })

  it('removes seats that became unavailable during normal refresh', () => {
    const result = resolveSeatSelectionAfterRefresh({
      selectedSeatIds: [1, 2],
      previewSeatIds: [3, 4],
      availableSeatIds: new Set([2, 4]),
      preserveUnavailableSelection: false,
    })

    expect(result).toEqual({
      selectedSeatIds: [2],
      previewSeatIds: [4],
      changed: true,
    })
  })
})
