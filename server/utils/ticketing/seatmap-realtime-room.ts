import { parseSeatmapRealtimeMessage, serializeSeatmapRealtimeMessage } from '~~/types/seatmap-realtime'

export class SeatmapRealtimeRoom {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/connect') {
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('WebSocket upgrade required.', { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()

      this.state.acceptWebSocket(server)

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    if (url.pathname === '/broadcast') {
      if (request.method !== 'POST') {
        return new Response('Not found.', { status: 404 })
      }

      const body = await request.text()
      const message = parseSeatmapRealtimeMessage(body)

      if (!message) {
        return new Response('Invalid seatmap realtime message.', { status: 400 })
      }

      const serialized = serializeSeatmapRealtimeMessage(message)
      const sockets = this.state.getWebSockets()

      for (const socket of sockets) {
        try {
          socket.send(serialized)
        }
        catch {
          try {
            socket.close(1011, 'Broadcast failed')
          }
          catch {
          }
        }
      }

      return new Response(null, { status: 204 })
    }

    return new Response('Not found.', { status: 404 })
  }
}
