import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueStatus } from '#shared/commonEnums'
import { BOOKING_SESSION_TTL_SECONDS, createBookingSession, createCaptchaRequiredError, hasBookingSession, requireBookingSession, requireBookingSessionOrQueueEntry } from '~~/server/utils/ticketing/captcha-pass'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-16T00:00:00.000Z'))

  vi.stubGlobal('createError', (opts: Record<string, unknown>) => Object.assign(new Error(String(opts.statusText ?? '')), opts))
  vi.stubGlobal('tables', {
    queueEntries: {
      eventSessionId: 'eventSessionId',
      customerKey: 'customerKey',
    },
  })
})

describe('booking session captcha access', () => {
  it('uses a ten minute session TTL', () => {
    expect(BOOKING_SESSION_TTL_SECONDS).toBe(600)
  })

  it('creates a booking session in KV with the configured TTL', async () => {
    const set = vi.fn()
    vi.stubGlobal('useKV', () => ({
      set,
      get: vi.fn(),
    }))

    const result = await createBookingSession(12, 'customer_1')

    expect(result.eventSessionId).toBe(12)
    expect(result.customerKey).toBe('customer_1')
    expect(result.createdAt).toBe('2026-05-16T00:00:00.000Z')
    expect(set).toHaveBeenCalledWith('booking-session:12:customer_1', '2026-05-16T00:00:00.000Z', { ttl: BOOKING_SESSION_TTL_SECONDS })
  })

  it('detects an existing booking session', async () => {
    vi.stubGlobal('useKV', () => ({
      get: vi.fn().mockResolvedValue('2026-05-16T00:00:00.000Z'),
    }))

    await expect(hasBookingSession(12, 'customer_1')).resolves.toBe(true)
  })

  it('returns false when no booking session exists', async () => {
    vi.stubGlobal('useKV', () => ({
      get: vi.fn().mockResolvedValue(null),
    }))

    await expect(hasBookingSession(12, 'customer_1')).resolves.toBe(false)
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

  it('passes requireBookingSession when session exists', async () => {
    vi.stubGlobal('useKV', () => ({
      get: vi.fn().mockResolvedValue('2026-05-16T00:00:00.000Z'),
    }))

    await expect(requireBookingSession(12, 'customer_1')).resolves.toBeUndefined()
  })

  it('rejects requireBookingSession when no session exists', async () => {
    vi.stubGlobal('useKV', () => ({
      get: vi.fn().mockResolvedValue(null),
    }))

    await expect(requireBookingSession(12, 'customer_1')).rejects.toMatchObject({
      status: 403,
      data: {
        error: {
          code: 'CAPTCHA_REQUIRED',
        },
      },
    })
  })

  it('allows access with booking session even without queue entry', async () => {
    vi.stubGlobal('useKV', () => ({
      get: vi.fn().mockResolvedValue('2026-05-16T00:00:00.000Z'),
    }))

    vi.stubGlobal('useDB', () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => null,
          }),
        }),
      }),
    }))

    await expect(requireBookingSessionOrQueueEntry(12, 'customer_1')).resolves.toBeUndefined()
  })

  it('allows access with queue entry even without booking session', async () => {
    vi.stubGlobal('useKV', () => ({
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

    await expect(requireBookingSessionOrQueueEntry(12, 'customer_1')).resolves.toBeUndefined()
  })

  it('rejects when neither booking session nor queue entry exists', async () => {
    vi.stubGlobal('useKV', () => ({
      get: vi.fn().mockResolvedValue(null),
    }))

    vi.stubGlobal('useDB', () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => null,
          }),
        }),
      }),
    }))

    await expect(requireBookingSessionOrQueueEntry(12, 'customer_1')).rejects.toMatchObject({
      status: 403,
      data: {
        error: {
          code: 'CAPTCHA_REQUIRED',
        },
      },
    })
  })
})
