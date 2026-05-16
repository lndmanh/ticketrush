import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueStatus } from '#shared/commonEnums'
import { CAPTCHA_PASS_TTL_SECONDS, createCaptchaPass, createCaptchaRequiredError, hasCaptchaPass, parseCaptchaPassRecord, requireCaptchaPassOrLiveQueueEntry, requireSeatAccessProof } from '~~/server/utils/ticketing/captcha-pass'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-16T00:00:00.000Z'))
})

describe('booking captcha pass helper', () => {
  it('uses a ten minute captcha pass TTL', () => {
    expect(CAPTCHA_PASS_TTL_SECONDS).toBe(600)
  })

  it('parses a valid captcha pass record', () => {
    expect(parseCaptchaPassRecord(JSON.stringify({
      eventSessionId: 12,
      customerKey: 'customer_1',
      createdAt: '2026-05-16T00:00:00.000Z',
    }))).toEqual({
      eventSessionId: 12,
      customerKey: 'customer_1',
      createdAt: '2026-05-16T00:00:00.000Z',
    })
  })

  it('rejects invalid captcha pass records', () => {
    expect(parseCaptchaPassRecord(null)).toBeNull()
    expect(parseCaptchaPassRecord('not json')).toBeNull()
    expect(parseCaptchaPassRecord(JSON.stringify({ eventSessionId: 0, customerKey: 'customer_1', createdAt: '2026-05-16T00:00:00.000Z' }))).toBeNull()
    expect(parseCaptchaPassRecord(JSON.stringify({ eventSessionId: 12, customerKey: '', createdAt: '2026-05-16T00:00:00.000Z' }))).toBeNull()
    expect(parseCaptchaPassRecord(JSON.stringify({ eventSessionId: 12, customerKey: 'customer_1', createdAt: '' }))).toBeNull()
  })

  it('writes a captcha pass with the configured ttl', async () => {
    const set = vi.fn()
    vi.stubGlobal('useKV', () => ({
      set,
      get: vi.fn(),
    }))

    const record = await createCaptchaPass(12, 'customer_1')

    expect(record.eventSessionId).toBe(12)
    expect(record.customerKey).toBe('customer_1')
    expect(set).toHaveBeenCalledWith('booking-captcha-pass:12:customer_1', expect.any(String), { ttl: CAPTCHA_PASS_TTL_SECONDS })
  })

  it('rejects invalid captcha pass input before writing', async () => {
    const set = vi.fn()
    vi.stubGlobal('useKV', () => ({
      set,
      get: vi.fn(),
    }))

    await expect(createCaptchaPass(0, 'customer_1')).rejects.toMatchObject({
      data: {
        error: {
          code: 'CAPTCHA_REQUIRED',
        },
      },
    })
    expect(set).not.toHaveBeenCalled()
  })

  it('accepts a fresh matching captcha pass record', async () => {
    vi.stubGlobal('useKV', () => ({
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(JSON.stringify({
        eventSessionId: 12,
        customerKey: 'customer_1',
        createdAt: '2026-05-16T00:00:00.000Z',
      })),
    }))

    await expect(hasCaptchaPass(12, 'customer_1')).resolves.toBe(true)
  })

  it('rejects expired or mismatched captcha pass records', async () => {
    const get = vi.fn()
    vi.stubGlobal('useKV', () => ({
      set: vi.fn(),
      get,
    }))

    get.mockResolvedValueOnce(JSON.stringify({
      eventSessionId: 12,
      customerKey: 'customer_1',
      createdAt: '2026-05-15T23:49:59.000Z',
    }))
    await expect(hasCaptchaPass(12, 'customer_1')).resolves.toBe(false)

    get.mockResolvedValueOnce(JSON.stringify({
      eventSessionId: 12,
      customerKey: 'customer_1',
      createdAt: '2026-05-16T00:10:01.000Z',
    }))
    await expect(hasCaptchaPass(12, 'customer_1')).resolves.toBe(false)

    get.mockResolvedValueOnce(JSON.stringify({
      eventSessionId: 12,
      customerKey: 'customer_2',
      createdAt: '2026-05-16T00:00:00.000Z',
    }))
    await expect(hasCaptchaPass(12, 'customer_1')).resolves.toBe(false)
  })

  it('creates the captcha required error shape', () => {
    expect(createCaptchaRequiredError()).toMatchObject({
      status: 403,
      statusText: 'Forbidden',
      data: {
        success: false,
        error: {
          code: 'CAPTCHA_REQUIRED',
          message: 'Complete the captcha check before booking this session.',
        },
      },
    })
  })

  it('rejects seat access without proof', async () => {
    vi.stubGlobal('useDB', () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => ({
              status: QueueStatus.Waiting,
            }),
          }),
        }),
      }),
    }))
    vi.stubGlobal('useKV', () => ({
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
    }))

    await expect(requireSeatAccessProof(12, 'customer_1')).rejects.toMatchObject({
      status: 403,
      data: {
        error: {
          code: 'CAPTCHA_REQUIRED',
        },
      },
    })
  })

  it('allows waiting and active-admission queue entries for live queue access', async () => {
    vi.stubGlobal('useKV', () => ({
      set: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
    }))

    vi.stubGlobal('useDB', () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => ({
              status: QueueStatus.Waiting,
            }),
          }),
        }),
      }),
    }))

    await expect(requireCaptchaPassOrLiveQueueEntry(12, 'customer_1')).resolves.toBeUndefined()

    vi.stubGlobal('useDB', () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => ({
              status: QueueStatus.Admitted,
              passToken: 'pass_1',
              expiresAt: new Date('2026-05-16T00:05:00.000Z'),
            }),
          }),
        }),
      }),
    }))

    await expect(requireCaptchaPassOrLiveQueueEntry(12, 'customer_1')).resolves.toBeUndefined()
  })
})
