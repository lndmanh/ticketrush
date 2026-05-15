import { describe, expect, it } from 'vitest'
import { getSectionGridCells } from '@/lib/seatmapGrid'
import {
  getVenueLayoutPresetCompactSummary,
  getVenueLayoutPresetSeatCount,
  getVenueLayoutPresetSummary,
  venueLayoutPresets,
} from '@/lib/venueLayoutPresets'

function getPlacementKey(cell: { x: number, y: number }) {
  return `${cell.x}:${cell.y}`
}

describe('venueLayoutPresets', () => {
  it('includes varied section counts', () => {
    const sectionCounts = venueLayoutPresets.map(preset => preset.sections.length)

    expect(new Set(sectionCounts).size).toBeGreaterThan(1)
  })

  it('includes explicit custom placements beyond defaults', () => {
    const hasCustomPlacement = venueLayoutPresets.some(preset => preset.sections.some((section, index) => {
      const defaultPlacement = index === 0
        ? { gridX: 0, gridY: 0, gridW: 25, gridH: 4 }
        : index === 1
          ? { gridX: 0, gridY: 5, gridW: 12, gridH: 4 }
          : index === 2
            ? { gridX: 13, gridY: 5, gridW: 12, gridH: 4 }
            : { gridX: 0, gridY: 10 + (Math.floor((index - 3) / 2) * 5), gridW: 12, gridH: 4 }

      return section.placement.gridX !== defaultPlacement.gridX
        || section.placement.gridY !== defaultPlacement.gridY
        || section.placement.gridW !== defaultPlacement.gridW
        || section.placement.gridH !== defaultPlacement.gridH
    }))

    expect(hasCustomPlacement).toBe(true)
  })

  it('keeps section grid placements within 25 columns without overlap', () => {
    for (const preset of venueLayoutPresets) {
      const cells = preset.sections.flatMap(section => getSectionGridCells(section.placement))
      const seen = new Set<string>()

      for (const cell of cells) {
        expect(cell.x).toBeGreaterThanOrEqual(0)
        expect(cell.x).toBeLessThan(25)
        expect(cell.y).toBeGreaterThanOrEqual(0)

        const key = getPlacementKey(cell)
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('generates seat counts and compact summaries', () => {
    const clubPreset = venueLayoutPresets[0]

    if (!clubPreset) {
      throw new Error('Missing club preset')
    }

    expect(getVenueLayoutPresetSeatCount(clubPreset)).toBe(122)
    expect(getVenueLayoutPresetSummary(clubPreset)).toBe('3 sections · 122 seats')
    expect(getVenueLayoutPresetCompactSummary(clubPreset)).toContain('Front VIP: 4×8 @ 0,0')
  })
})
