import { describe, expect, it } from 'vitest'
import { formatWaitingRoomDuration, getWaitingRoomRemainingSeconds } from '@/utils/waitingRoomTimer'

describe('waiting room timer helpers', () => {
  it('counts down from the received state timestamp', () => {
    const receivedAt = new Date('2026-01-01T12:00:00.000Z').getTime()
    const currentAt = new Date('2026-01-01T12:00:01.000Z').getTime()

    expect(getWaitingRoomRemainingSeconds(180, receivedAt, currentAt)).toBe(179)
    expect(formatWaitingRoomDuration(179)).toBe('02:59')
  })

  it('clamps to zero after expiry', () => {
    const receivedAt = new Date('2026-01-01T12:00:00.000Z').getTime()
    const currentAt = new Date('2026-01-01T12:03:01.000Z').getTime()

    expect(getWaitingRoomRemainingSeconds(180, receivedAt, currentAt)).toBe(0)
  })

  it('formats zero as 00:00', () => {
    expect(formatWaitingRoomDuration(0)).toBe('00:00')
  })
})
