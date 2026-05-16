import eventSessionService from '~~/server/utils/database/event-session'
import { readTicketingSessionKeyFromCookieHeader } from '~~/server/utils/ticketing/session'
import { BookingAccessDecision, resolveBookingAccess } from '~~/server/utils/ticketing/booking-access'
import { serializeSeatmapRealtimeMessage } from '~~/types/seatmap-realtime'
import { EventStatus } from '#shared/commonEnums'

interface SeatmapPeerContext {
  sessionPublicId: string
  version: number
}

function isSeatmapPeerContext(value: unknown): value is SeatmapPeerContext {
  return typeof value === 'object'
    && value !== null
    && 'sessionPublicId' in value
    && typeof value.sessionPublicId === 'string'
    && value.sessionPublicId.trim() !== ''
    && 'version' in value
    && typeof value.version === 'number'
    && Number.isSafeInteger(value.version)
    && value.version >= 0
}

export default defineWebSocketHandler({
  async upgrade(request) {
    const url = new URL(request.url)
    const sessionPublicId = url.pathname.split('/').at(-2)

    if (!sessionPublicId) {
      throw new Response('Session ID is required.', { status: 400 })
    }

    const session = await eventSessionService.getByPublicId(sessionPublicId)
    if (!session || session.status === EventStatus.Draft || session.status === EventStatus.Cancelled) {
      throw new Response('Session not found.', { status: 404 })
    }

    const customerKey = readTicketingSessionKeyFromCookieHeader(request.headers.get('cookie'))
    if (!customerKey) {
      throw new Response('Unauthorized.', { status: 401 })
    }

    const access = await resolveBookingAccess(session.id, customerKey)

    if (access.decision === BookingAccessDecision.QueueRequired) {
      throw new Response('Join the waiting room before choosing seats.', { status: 403 })
    }

    if (access.decision === BookingAccessDecision.Forbidden) {
      throw new Response('Complete the captcha check before choosing seats.', { status: 403 })
    }

    return {
      namespace: `seatmap:${session.publicId}`,
      context: {
        sessionPublicId: session.publicId,
        version: session.seatmapVersion,
      },
    }
  },
  open(peer) {
    if (!isSeatmapPeerContext(peer.context)) {
      peer.close(1011, 'Missing seatmap context')
      return
    }

    peer.subscribe('seatmap')
    peer.send(serializeSeatmapRealtimeMessage({
      type: 'seatmap-connected',
      sessionPublicId: peer.context.sessionPublicId,
      version: peer.context.version,
    }))
  },
  close(peer) {
    peer.unsubscribe('seatmap')
  },
})
