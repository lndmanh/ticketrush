import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueStatus } from '#shared/commonEnums'
import { BookingAccessDecision, createQueueRequiredError, requireSeatBookingAccess, resolveBookingAccess } from '~~/server/utils/ticketing/booking-access'
import queueService from '~~/server/utils/ticketing/queue'

function stubQueueEntry(entry: { status: QueueStatus, passToken?: string | null, expiresAt?: Date | string | null } | null) {
  vi.stubGlobal('useDB', () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          get: async () => entry,
        }),
      }),
    }),
  }))
}

function stubBookingSession(value: string | null) {
  vi.stubGlobal('useKV', () => ({
    set: vi.fn(),
    get: vi.fn().mockResolvedValue(value),
  }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-16T00:01:00.000Z'))

  vi.stubGlobal('createError', (opts: Record<string, unknown>) => Object.assign(new Error(String(opts.statusText ?? '')), opts))
  vi.stubGlobal('tables', {
    queueEntries: {
      eventSessionId: 'eventSessionId',
      customerKey: 'customerKey',
    },
  })

  stubBookingSession(null)
  stubQueueEntry(null)
})

describe('booking access helper', () => {
  it('allows active admissions without captcha', async () => {
    stubQueueEntry({
      status: QueueStatus.Admitted,
      passToken: 'pass_1',
      expiresAt: new Date('2026-05-16T00:05:00.000Z'),
    })

    await expect(resolveBookingAccess(12, 'customer_1')).resolves.toEqual({
      decision: BookingAccessDecision.SeatAccessAllowed,
      shouldQueue: false,
    })
  })

  it('allows booking sessions when queue pressure is low', async () => {
    stubBookingSession('2026-05-16T00:00:00.000Z')
    vi.spyOn(queueService, 'shouldQueue').mockResolvedValue(false)

    await expect(resolveBookingAccess(12, 'customer_1', 'pass_1')).resolves.toEqual({
      decision: BookingAccessDecision.SeatAccessAllowed,
      shouldQueue: false,
    })
  })

  it('requires the queue when queue pressure is high despite booking session', async () => {
    stubBookingSession('2026-05-16T00:00:00.000Z')
    vi.spyOn(queueService, 'shouldQueue').mockResolvedValue(true)

    await expect(resolveBookingAccess(12, 'customer_1', 'pass_1')).resolves.toEqual({
      decision: BookingAccessDecision.QueueRequired,
      shouldQueue: true,
    })
  })

  it('requires the queue for waiting entries without captcha', async () => {
    stubQueueEntry({
      status: QueueStatus.Waiting,
    })

    await expect(resolveBookingAccess(12, 'customer_1')).resolves.toEqual({
      decision: BookingAccessDecision.QueueRequired,
      shouldQueue: true,
    })
  })

  it('forbids access without captcha or queue entry', async () => {
    await expect(resolveBookingAccess(12, 'customer_1')).resolves.toEqual({
      decision: BookingAccessDecision.Forbidden,
      shouldQueue: false,
    })
  })

  it('throws the queue required error for queue-required access', async () => {
    stubQueueEntry({
      status: QueueStatus.Waiting,
    })

    await expect(requireSeatBookingAccess(12, 'customer_1')).rejects.toMatchObject({
      status: 403,
      data: {
        error: {
          code: 'QUEUE_REQUIRED',
        },
      },
    })
  })

  it('throws the captcha required error for forbidden access', async () => {
    await expect(requireSeatBookingAccess(12, 'customer_1')).rejects.toMatchObject({
      status: 403,
      data: {
        error: {
          code: 'CAPTCHA_REQUIRED',
        },
      },
    })
  })

  it('creates the queue required error shape', () => {
    expect(createQueueRequiredError()).toMatchObject({
      status: 403,
      statusText: 'Forbidden',
      data: {
        success: false,
        error: {
          code: 'QUEUE_REQUIRED',
          message: 'Join the waiting room before choosing seats.',
        },
      },
    })
  })
})
