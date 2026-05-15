import { describe, expect, it } from 'vitest'
import { QueueStatus } from '#shared/commonEnums'
import { parseQueueRealtimeMessage, serializeQueueRealtimeMessage } from '~~/types/queue-realtime'

describe('queue realtime message contract', () => {
  it('parses queue-connected', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-connected',
      sessionPublicId: 'session_1',
    }))).toEqual({
      type: 'queue-connected',
      sessionPublicId: 'session_1',
    })
  })

  it('parses queue-state with admitted status', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          status: QueueStatus.Admitted,
          expiresAt: '2026-01-01T12:00:00.000Z',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 1,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: '/events/event_1/sessions/session_1/seats',
      },
    }))).toEqual({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          status: QueueStatus.Admitted,
          expiresAt: '2026-01-01T12:00:00.000Z',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 1,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: '/events/event_1/sessions/session_1/seats',
      },
    })
  })

  it('parses queue-state without passToken', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          status: QueueStatus.Admitted,
          expiresAt: '2026-01-01T12:00:00.000Z',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 1,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: null,
      },
    }))).toEqual({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          status: QueueStatus.Admitted,
          expiresAt: '2026-01-01T12:00:00.000Z',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 1,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: null,
      },
    })
  })

  it('parses queue-state with null state', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: null,
    }))).toEqual({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: null,
    })
  })

  it('rejects missing state', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
    }))).toBeNull()
  })

  it('rejects missing state.entry', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        position: 0,
        waitingCount: 0,
        admittedCount: 0,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: null,
      },
    }))).toBeNull()
  })

  it('rejects invalid entry status', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          status: 'unknown',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 0,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: null,
      },
    }))).toBeNull()
  })

  it('rejects invalid expiresAt', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          status: QueueStatus.Admitted,
          expiresAt: '   ',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 1,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: '/events/event_1/sessions/session_1/seats',
      },
    }))).toBeNull()
  })

  it('rejects blank sessionPublicId', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-connected',
      sessionPublicId: '   ',
    }))).toBeNull()
  })

  it('rejects missing sessionPublicId', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-connected',
    }))).toBeNull()
  })

  it('rejects unknown type', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-unknown',
      sessionPublicId: 'session_1',
    }))).toBeNull()
  })

  it('rejects invalid redirectPath', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: null,
        position: 0,
        waitingCount: 0,
        admittedCount: 0,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: 123,
      },
    }))).toBeNull()
  })

  it('rejects non-integer numeric field', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: null,
        position: 0.5,
        waitingCount: 0,
        admittedCount: 0,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: null,
      },
    }))).toBeNull()
  })

  it('rejects unexpected passToken field', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: {
          passToken: 'pass_1',
          status: QueueStatus.Admitted,
          expiresAt: '2026-01-01T12:00:00.000Z',
        },
        position: 0,
        waitingCount: 0,
        admittedCount: 1,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: '/events/event_1/sessions/session_1/seats',
      },
    }))).toBeNull()
  })

  it('parses queue-resync-required with admitted reason', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-resync-required',
      sessionPublicId: 'session_1',
      reason: 'admitted',
    }))).toEqual({
      type: 'queue-resync-required',
      sessionPublicId: 'session_1',
      reason: 'admitted',
    })
  })

  it('rejects malformed JSON', () => {
    expect(parseQueueRealtimeMessage('{')).toBeNull()
  })

  it('rejects unknown reason', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-resync-required',
      sessionPublicId: 'session_1',
      reason: 'unknown',
    }))).toBeNull()
  })

  it('rejects invalid state with negative position', () => {
    expect(parseQueueRealtimeMessage(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: {
        entry: null,
        position: -1,
        waitingCount: 0,
        admittedCount: 0,
        queueBatchSize: 25,
        queueWindowSeconds: 300,
        estimatedWaitSeconds: 0,
        redirectPath: null,
      },
    }))).toBeNull()
  })

  it('serializes queue realtime messages', () => {
    expect(serializeQueueRealtimeMessage({
      type: 'queue-connected',
      sessionPublicId: 'session_1',
    })).toBe(JSON.stringify({
      type: 'queue-connected',
      sessionPublicId: 'session_1',
    }))
  })

  it('serializes queue-state with null state', () => {
    expect(serializeQueueRealtimeMessage({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: null,
    })).toBe(JSON.stringify({
      type: 'queue-state',
      sessionPublicId: 'session_1',
      state: null,
    }))
  })
})
