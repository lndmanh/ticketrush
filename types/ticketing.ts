import type { ApiResponseSuccess } from '~~/types/api'
import type { DateLike } from '~~/types/events'

export interface EventSessionGateResponse {
  shouldQueue: boolean
  sessionPublicId: string
  eventId: number
}

export interface QueueStateEntry {
  passToken: string | null
  status: string
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
}

export type HoldResponse = ApiResponseSuccess<{
  hold: {
    publicId: string
  }
}>

export type CheckoutStartResponse = ApiResponseSuccess<{
  publicId: string
}>
