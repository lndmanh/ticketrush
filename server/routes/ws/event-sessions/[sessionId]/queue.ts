import eventSessionService from '~~/server/utils/database/event-session'
import { readTicketingSessionKeyFromCookieHeader } from '~~/server/utils/ticketing/session'
import { refreshQueueStatusForSession } from '~~/server/utils/ticketing/queue-status'
import { hasBookingSessionOrQueueEntry } from '~~/server/utils/ticketing/captcha-pass'
import { serializeQueueRealtimeMessage } from '~~/types/queue-realtime'
import { EventStatus } from '#shared/commonEnums'

interface QueuePeerContext {
  eventSessionId: number
  sessionPublicId: string
  customerKey: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isQueuePeerContext(value: unknown): value is QueuePeerContext {
  if (!isRecord(value)) {
    return false
  }

  if (!('eventSessionId' in value) || !('sessionPublicId' in value) || !('customerKey' in value)) {
    return false
  }

  return typeof value.eventSessionId === 'number'
    && Number.isSafeInteger(value.eventSessionId)
    && value.eventSessionId > 0
    && typeof value.sessionPublicId === 'string'
    && value.sessionPublicId.trim() !== ''
    && typeof value.customerKey === 'string'
    && value.customerKey.trim() !== ''
}

function safeSend(peer: { send: (message: string) => void }, message: string) {
  try {
    peer.send(message)
  }
  catch {
    // Best-effort websocket delivery.
  }
}

type QueuePeerState = {
  closed: boolean
  lastSerializedState: string | null
  timeoutHandle: ReturnType<typeof setTimeout> | null
  resolveDelay: (() => void) | null
}

const queuePeerStates = new WeakMap<object, QueuePeerState>()

export default defineWebSocketHandler({
  async upgrade(request) {
    const url = new URL(request.url)
    const sessionPublicId = url.pathname.split('/').at(-2)

    if (!sessionPublicId) {
      throw new Response('Session ID is required.', { status: 400 })
    }

    const customerKey = readTicketingSessionKeyFromCookieHeader(request.headers.get('cookie'))
    if (!customerKey) {
      throw new Response('Unauthorized.', { status: 401 })
    }

    const session = await eventSessionService.getByPublicId(sessionPublicId)
    if (!session || session.status === EventStatus.Draft || session.status === EventStatus.Cancelled) {
      throw new Response('Session not found.', { status: 404 })
    }

    const hasAccess = await hasBookingSessionOrQueueEntry(session.id, customerKey)
    if (!hasAccess) {
      throw new Response('Complete the captcha check before joining the waiting room.', { status: 403 })
    }

    return {
      namespace: `queue:${session.publicId}`,
      context: {
        eventSessionId: session.id,
        sessionPublicId: session.publicId,
        customerKey,
      },
    }
  },
  async open(peer) {
    if (!isQueuePeerContext(peer.context)) {
      peer.close(1011, 'Missing queue context')
      return
    }

    peer.subscribe('queue')
    safeSend(peer, serializeQueueRealtimeMessage({
      type: 'queue-connected',
      sessionPublicId: peer.context.sessionPublicId,
    }))

    const peerState: QueuePeerState = {
      closed: false,
      lastSerializedState: null,
      timeoutHandle: null,
      resolveDelay: null,
    }
    queuePeerStates.set(peer, peerState)

    const runPollLoop = async () => {
      let initialAttempt = true
      while (!peerState.closed) {
        try {
          const state = await refreshQueueStatusForSession(peer.context.eventSessionId, peer.context.customerKey)
          if (peerState.closed) {
            return
          }

          const serialized = serializeQueueRealtimeMessage({
            type: 'queue-state',
            sessionPublicId: peer.context.sessionPublicId,
            state,
          })

          if (serialized !== peerState.lastSerializedState) {
            peerState.lastSerializedState = serialized
            safeSend(peer, serialized)
          }
        }
        catch {
          if (peerState.closed) {
            return
          }

          if (initialAttempt) {
            safeSend(peer, serializeQueueRealtimeMessage({
              type: 'queue-resync-required',
              sessionPublicId: peer.context.sessionPublicId,
              reason: 'server-recovery',
            }))
          }
        }
        finally {
          initialAttempt = false
        }

        if (peerState.closed) {
          return
        }

        await new Promise<void>((resolve) => {
          peerState.resolveDelay = () => {
            peerState.resolveDelay = null
            resolve()
          }

          peerState.timeoutHandle = setTimeout(() => {
            peerState.timeoutHandle = null
            if (peerState.resolveDelay) {
              peerState.resolveDelay()
            }
          }, 2500)
        })
      }
    }

    void runPollLoop().catch(() => {
      // Best-effort websocket polling loop.
    })
  },
  close(peer) {
    const state = queuePeerStates.get(peer)
    if (state) {
      state.closed = true
      if (state.timeoutHandle) {
        clearTimeout(state.timeoutHandle)
        state.timeoutHandle = null
      }
      if (state.resolveDelay) {
        state.resolveDelay()
      }
      queuePeerStates.delete(peer)
    }

    peer.unsubscribe('queue')
  },
})
