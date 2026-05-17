import { describe, expect, it } from 'vitest'
import { apiRoutes } from '#shared/apiRoutes'

describe('apiRoutes', () => {
  it('builds the seatmap version endpoint path', () => {
    expect(apiRoutes.eventSessionSeatmapVersion('session_1')).toBe('/api/event-sessions/session_1/seatmap-version')
  })
})
