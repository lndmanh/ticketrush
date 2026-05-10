import eventSessionService from '~~/server/utils/database/event-session'
import { serializeSeatmapRealtimeMessage } from '~~/types/seatmap-realtime'

interface SeatmapPeerContext {
  sessionPublicId: string
  version: number
}

function isSeatmapPeerContext(value: unknown): value is SeatmapPeerContext {
  return typeof value === 'object'
    && value !== null
    && 'sessionPublicId' in value
    && 'version' in value
}

export default defineWebSocketHandler({
  async upgrade(request) {
    const url = new URL(request.url)
    const sessionPublicId = url.pathname.split('/').at(-2)

    if (!sessionPublicId) {
      throw new Response('Session ID is required.', { status: 400 })
    }

    const session = await eventSessionService.getByPublicId(sessionPublicId)
    if (!session || session.status === 'draft' || session.status === 'cancelled') {
      throw new Response('Session not found.', { status: 404 })
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
