import { describe, expect, it } from 'vitest'
import { QueueStatus } from '#shared/commonEnums'
import { isActiveQueueAdmission, shouldExpireQueueAdmission } from '~~/server/utils/ticketing/queue-admission-state'

describe('queue admission state helper', () => {
  const now = new Date('2026-01-01T12:00:00.000Z')

  it('matches an active admitted entry with a future expiry', () => {
    const entry = {
      status: QueueStatus.Admitted,
      passToken: 'pass_1',
      expiresAt: new Date('2026-01-01T12:05:00.000Z'),
    }

    expect(isActiveQueueAdmission(entry, now)).toBe(true)
    expect(shouldExpireQueueAdmission(entry, now)).toBe(false)
  })

  it('expires admitted entries with a missing pass token', () => {
    const entry = {
      status: QueueStatus.Admitted,
      passToken: null,
      expiresAt: new Date('2026-01-01T12:05:00.000Z'),
    }

    expect(isActiveQueueAdmission(entry, now)).toBe(false)
    expect(shouldExpireQueueAdmission(entry, now)).toBe(true)
  })

  it('expires admitted entries with a missing expiry', () => {
    const entry = {
      status: QueueStatus.Admitted,
      passToken: 'pass_1',
      expiresAt: null,
    }

    expect(isActiveQueueAdmission(entry, now)).toBe(false)
    expect(shouldExpireQueueAdmission(entry, now)).toBe(true)
  })

  it('expires admitted entries with a past expiry', () => {
    const entry = {
      status: QueueStatus.Admitted,
      passToken: 'pass_1',
      expiresAt: new Date('2026-01-01T11:59:59.000Z'),
    }

    expect(isActiveQueueAdmission(entry, now)).toBe(false)
    expect(shouldExpireQueueAdmission(entry, now)).toBe(true)
  })

  it('does not treat waiting entries as active or expirable', () => {
    const entry = {
      status: QueueStatus.Waiting,
      passToken: 'pass_1',
      expiresAt: new Date('2026-01-01T11:59:59.000Z'),
    }

    expect(isActiveQueueAdmission(entry, now)).toBe(false)
    expect(shouldExpireQueueAdmission(entry, now)).toBe(false)
  })
})
