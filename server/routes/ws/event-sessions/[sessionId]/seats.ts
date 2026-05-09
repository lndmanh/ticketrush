import type { H3Event } from 'h3'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError } from '~~/server/utils/apiResponse'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'

function createHeadersFromRequest(event: H3Event) {
  const headers = new Headers()
  const requestHeaders = event.node.req.headers

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (typeof value === 'string') {
      headers.set(key, value)
    }
    else if (Array.isArray(value)) {
      headers.set(key, value.join(', '))
    }
  }

  return headers
}

export default defineEventHandler(async (event) => {
  if (event.node.req.headers.upgrade?.toLowerCase() !== 'websocket') {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_REQUEST', message: 'WebSocket upgrade required.' })
  }

  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)

  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  if (session.status === 'draft' || session.status === 'cancelled') {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  getTicketingSessionKey(event)

  const { SEATMAP_REALTIME_ROOM: namespace } = getSeatmapRealtimeEnv(event)
  if (!namespace) {
    throw apiError({ status: 503, statusText: 'Service Unavailable', code: 'SEATMAP_REALTIME_UNAVAILABLE', message: 'Seatmap realtime is unavailable.' })
  }

  const stub = namespace.get(namespace.idFromName(session.publicId))
  const requestHeaders = createHeadersFromRequest(event)

  return stub.fetch('https://seatmap-realtime-room.local/connect', {
    headers: requestHeaders,
  })
})
