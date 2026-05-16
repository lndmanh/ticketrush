import { describe, expect, it, vi } from 'vitest'
import { clearEventSessionAccessData, getEventSessionGateFetchKey, getEventSessionSeatmapFetchKey, isEventSessionAccessFetchKey } from '@/utils/eventSessionAccessData'

describe('event session access async data keys', () => {
  it('builds stable keys for gate and seatmap access fetches', () => {
    expect(getEventSessionGateFetchKey('session_1')).toBe('event-session-gate:session_1:default')
    expect(getEventSessionGateFetchKey('session_1', 'pass_1')).toBe('event-session-gate:session_1:pass_1')
    expect(getEventSessionSeatmapFetchKey('session_1', 'en')).toBe('event-session-seatmap:session_1:en')
  })

  it('matches only access keys for the requested event session', () => {
    expect(isEventSessionAccessFetchKey('event-session-gate:session_1:default', 'session_1')).toBe(true)
    expect(isEventSessionAccessFetchKey('event-session-seatmap:session_1:en', 'session_1')).toBe(true)
    expect(isEventSessionAccessFetchKey('event-session-gate:session_10:default', 'session_1')).toBe(false)
    expect(isEventSessionAccessFetchKey('event-session-detail:session_1', 'session_1')).toBe(false)
  })

  it('clears cached access data for the verified event session only', () => {
    const clearData = vi.fn<(predicate: (key: string) => boolean) => void>()

    clearEventSessionAccessData('session_1', clearData)

    expect(clearData).toHaveBeenCalledTimes(1)
    const predicate = clearData.mock.calls[0]?.[0]
    expect(predicate).toBeDefined()
    if (!predicate) {
      return
    }

    expect(predicate('event-session-gate:session_1:default')).toBe(true)
    expect(predicate('event-session-seatmap:session_1:en')).toBe(true)
    expect(predicate('event-session-gate:session_10:default')).toBe(false)
    expect(predicate('event-session-detail:session_1')).toBe(false)
  })
})
