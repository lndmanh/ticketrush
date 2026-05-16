import { and, eq } from 'drizzle-orm'
import { apiError } from '~~/server/utils/apiResponse'
import { isActiveQueueAdmission } from '~~/server/utils/ticketing/queue-admission-state'
import queueService from '~~/server/utils/ticketing/queue'
import { createCaptchaRequiredError, hasBookingSession } from '~~/server/utils/ticketing/captcha-pass'
import { QueueStatus } from '#shared/commonEnums'

export enum BookingAccessDecision {
  Forbidden = 'forbidden',
  QueueRequired = 'queue_required',
  SeatAccessAllowed = 'seat_access_allowed',
}

export interface BookingAccessResult {
  decision: BookingAccessDecision
  shouldQueue: boolean
}

type QueueProofState = 'admitted' | 'waiting' | 'none'

async function getQueueEntry(eventSessionId: number, customerKey: string) {
  return useDB()
    .select()
    .from(tables.queueEntries)
    .where(and(
      eq(tables.queueEntries.eventSessionId, eventSessionId),
      eq(tables.queueEntries.customerKey, customerKey),
    ))
    .get()
}

function classifyQueueProof(entry: Awaited<ReturnType<typeof getQueueEntry>>): QueueProofState {
  if (!entry) {
    return 'none'
  }

  if (entry.status === QueueStatus.Waiting) {
    return 'waiting'
  }

  if (isActiveQueueAdmission(entry, new Date())) {
    return 'admitted'
  }

  return 'none'
}

export async function resolveBookingAccess(eventSessionId: number, customerKey: string, passToken?: string): Promise<BookingAccessResult> {
  if (await hasBookingSession(eventSessionId, customerKey)) {
    const shouldQueue = await queueService.shouldQueue(eventSessionId, customerKey, passToken)

    return {
      decision: shouldQueue ? BookingAccessDecision.QueueRequired : BookingAccessDecision.SeatAccessAllowed,
      shouldQueue,
    }
  }

  const queueEntry = await getQueueEntry(eventSessionId, customerKey)
  const queueProof = classifyQueueProof(queueEntry)

  if (queueProof === 'admitted') {
    return {
      decision: BookingAccessDecision.SeatAccessAllowed,
      shouldQueue: false,
    }
  }

  if (queueProof === 'waiting') {
    return {
      decision: BookingAccessDecision.QueueRequired,
      shouldQueue: true,
    }
  }

  return {
    decision: BookingAccessDecision.Forbidden,
    shouldQueue: false,
  }
}

export function createQueueRequiredError() {
  return apiError({
    status: 403,
    statusText: 'Forbidden',
    code: 'QUEUE_REQUIRED',
    message: 'Join the waiting room before choosing seats.',
  })
}

export async function requireSeatBookingAccess(eventSessionId: number, customerKey: string, passToken?: string) {
  const access = await resolveBookingAccess(eventSessionId, customerKey, passToken)

  if (access.decision === BookingAccessDecision.SeatAccessAllowed) {
    return access
  }

  if (access.decision === BookingAccessDecision.QueueRequired) {
    throw createQueueRequiredError()
  }

  throw createCaptchaRequiredError()
}
