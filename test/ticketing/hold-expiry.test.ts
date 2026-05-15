import { describe, expect, it } from 'vitest'
import { isExpiredActiveHold } from '~~/server/utils/ticketing/hold-expiry'
import { HoldStatus } from '#shared/commonEnums'

describe('hold expiry helper', () => {
  const now = new Date('2026-01-01T12:00:00.000Z')

  it('matches an expired active hold in scope', () => {
    expect(isExpiredActiveHold({
      publicId: 'hold_1',
      eventSessionId: 10,
      sessionKey: 'session_1',
      status: HoldStatus.Active,
      expiresAt: new Date('2026-01-01T11:59:59.000Z'),
    }, now, {
      eventSessionId: 10,
      holdPublicId: 'hold_1',
      sessionKey: 'session_1',
    })).toBe(true)
  })

  it('rejects non-expired holds', () => {
    expect(isExpiredActiveHold({
      publicId: 'hold_1',
      eventSessionId: 10,
      sessionKey: 'session_1',
      status: HoldStatus.Active,
      expiresAt: new Date('2026-01-01T12:00:01.000Z'),
    }, now, { eventSessionId: 10 })).toBe(false)
  })

  it('rejects holds outside the requested scope', () => {
    expect(isExpiredActiveHold({
      publicId: 'hold_1',
      eventSessionId: 11,
      sessionKey: 'session_1',
      status: HoldStatus.Active,
      expiresAt: new Date('2026-01-01T11:59:59.000Z'),
    }, now, { eventSessionId: 10 })).toBe(false)
  })
})
