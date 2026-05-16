import type { Event, EventSession, Order, OrderItem, SeatHold, Ticket } from '#shared/db'
import type { DateLike } from '~~/types/events'
import type { QueueStatus, SeatPricingSource } from '#shared/commonEnums'

export interface EventSessionGateResponse {
  shouldQueue: boolean
  sessionPublicId: string
  eventId: number
}

export interface QueueStateEntry {
  status: QueueStatus
  expiresAt?: DateLike | null
}

export interface QueueState {
  entry: QueueStateEntry | null
  position: number
  waitingCount: number
  admittedCount: number
  queueBatchSize: number
  queueWindowSeconds: number
  estimatedWaitSeconds: number
  redirectPath: string | null
}

export interface HoldData {
  hold: {
    publicId: string
  }
}

export interface CheckoutStartData {
  publicId: string
}

export interface CheckoutCancelData {
  order: Order
  hold: SeatHold | null | undefined
}

export interface CheckoutDetailData {
  order: Order
  items: (OrderItem & { pricingSource?: SeatPricingSource })[]
  tickets: Ticket[]
  hold: SeatHold | null | undefined
  event: Event | null | undefined
  eventSession: EventSession | null | undefined
}

export type TicketListItem = Ticket & {
  event: Event | null
  eventSession: EventSession | null
  orderItem: OrderItem | null
  order: Order | null
}

export interface TicketDetailData {
  ticket: Ticket
  order: Order | undefined
  event: Event | undefined
  eventSession: EventSession | null
  orderItem: OrderItem | undefined
}
