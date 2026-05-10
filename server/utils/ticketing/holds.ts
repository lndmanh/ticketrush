import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { CreateSeatHoldInput } from '#shared/schemas/ticketingSchema'
import { createPublicHoldId } from '~~/server/utils/ticketing/ids'
import queueService from '~~/server/utils/ticketing/queue'
import eventSessionService from '~~/server/utils/database/event-session'

const HOLD_DURATION_MS = 10 * 60 * 1000

class HoldService {
  private get db() {
    return useDB()
  }

  async getHoldByPublicId(holdPublicId: string) {
    return this.db
      .select()
      .from(tables.seatHolds)
      .where(eq(tables.seatHolds.publicId, holdPublicId))
      .get()
  }

  async getHoldWithSeats(holdPublicId: string) {
    const hold = await this.getHoldByPublicId(holdPublicId)
    if (!hold) {
      return null
    }

    const seats = await this.db
      .select()
      .from(tables.eventSeats)
      .where(eq(tables.eventSeats.holdId, hold.id))
      .all()

    return {
      hold,
      seats,
    }
  }

  async createHold(input: CreateSeatHoldInput & { sessionKey: string }, userId?: number) {
    const session = await eventSessionService.getById(input.eventSessionId)

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
    }

    const event = await this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, session.eventId))
      .get()

    if (!event) {
      throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
    }

    const now = new Date()
    if (session.status !== 'published' && session.status !== 'on_sale') {
      throw createError({ statusCode: 403, statusMessage: 'This session is not available for booking.' })
    }

    if (new Date(session.salesStartAt).getTime() > now.getTime()) {
      throw createError({ statusCode: 403, statusMessage: 'Ticket sales have not opened for this session.' })
    }

    if (new Date(session.salesEndAt).getTime() < now.getTime()) {
      throw createError({ statusCode: 403, statusMessage: 'Ticket sales have ended for this session.' })
    }

    const shouldQueue = await queueService.shouldQueue(input.eventSessionId, input.sessionKey, input.passToken)
    if (shouldQueue) {
      if (!input.passToken) {
        throw createError({ statusCode: 403, statusMessage: 'Queue admission token is required.' })
      }

      const isValidPass = await queueService.validatePass(input.eventSessionId, input.sessionKey, input.passToken)
      if (!isValidPass) {
        throw createError({ statusCode: 403, statusMessage: 'Queue admission token is invalid or expired.' })
      }
    }

    const existingHold = await this.db
      .select()
      .from(tables.seatHolds)
      .where(and(
        eq(tables.seatHolds.idempotencyKey, input.idempotencyKey),
        eq(tables.seatHolds.eventSessionId, input.eventSessionId),
        eq(tables.seatHolds.sessionKey, input.sessionKey),
      ))
      .get()

    if (existingHold) {
      return this.getHoldWithSeats(existingHold.publicId)
    }

    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS)

    try {
      const db = this.db
      const hold = await db
        .insert(tables.seatHolds)
        .values({
          publicId: createPublicHoldId(),
          eventId: session.eventId,
          eventSessionId: session.id,
          userId: userId ?? null,
          sessionKey: input.sessionKey,
          idempotencyKey: input.idempotencyKey,
          status: 'active',
          expiresAt,
          checkoutStartedAt: null,
          releasedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get()

      if (!hold) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create seat hold.' })
      }

      const availableSeats = await db
        .select()
        .from(tables.eventSeats)
        .where(and(
          eq(tables.eventSeats.eventSessionId, session.id),
          inArray(tables.eventSeats.id, input.eventSeatIds),
        ))
        .all()

      const sellableSeats = availableSeats.filter(seat => seat.status === 'available')
      if (sellableSeats.length !== input.eventSeatIds.length) {
        throw createError({ statusCode: 409, statusMessage: 'One or more selected seats are no longer available.' })
      }

      for (const seat of sellableSeats) {
        const lockedSeat = await db
          .update(tables.eventSeats)
          .set({
            status: 'locked',
            holdId: hold.id,
            lockedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(tables.eventSeats.id, seat.id),
            eq(tables.eventSeats.status, 'available'),
            isNull(tables.eventSeats.holdId),
          ))
          .returning()
          .get()

        if (!lockedSeat) {
          throw createError({ statusCode: 409, statusMessage: 'One or more selected seats are no longer available.' })
        }
      }

      await queueService.completeEntry(input.eventSessionId, input.sessionKey)

      return this.getHoldWithSeats(hold.publicId)
    }
    catch (error) {
      const scopedExistingHold = await this.db
        .select()
        .from(tables.seatHolds)
        .where(and(
          eq(tables.seatHolds.idempotencyKey, input.idempotencyKey),
          eq(tables.seatHolds.eventSessionId, input.eventSessionId),
          eq(tables.seatHolds.sessionKey, input.sessionKey),
        ))
        .get()

      if (scopedExistingHold) {
        return this.getHoldWithSeats(scopedExistingHold.publicId)
      }

      throw error
    }
  }

  async releaseHold(holdPublicId: string, sessionKey: string) {
    const hold = await this.db
      .select()
      .from(tables.seatHolds)
      .where(eq(tables.seatHolds.publicId, holdPublicId))
      .get()

    if (!hold || hold.sessionKey !== sessionKey) {
      throw createError({ statusCode: 404, statusMessage: 'Seat hold not found.' })
    }

    if (hold.status !== 'active') {
      return hold
    }

    const now = new Date()

    const db = this.db
    await db
      .update(tables.eventSeats)
      .set({
        status: 'available',
        holdId: null,
        lockedAt: null,
        updatedAt: now,
      })
      .where(eq(tables.eventSeats.holdId, hold.id))

    await db
      .update(tables.seatHolds)
      .set({
        status: 'released',
        releasedAt: now,
        updatedAt: now,
      })
      .where(eq(tables.seatHolds.id, hold.id))

    return this.getHoldByPublicId(holdPublicId)
  }

  async markCheckoutStarted(holdId: number) {
    return this.db
      .update(tables.seatHolds)
      .set({
        checkoutStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tables.seatHolds.id, holdId))
      .returning()
      .get()
  }

  async expireStaleHolds() {
    const now = new Date()
    const holds = await this.db
      .select()
      .from(tables.seatHolds)
      .all()

    const expiredHolds = holds.filter(hold => hold.status === 'active' && hold.expiresAt.getTime() <= now.getTime())

    for (const hold of expiredHolds) {
      const db = this.db
      await db
        .update(tables.eventSeats)
        .set({
          status: 'available',
          holdId: null,
          lockedAt: null,
          updatedAt: now,
        })
        .where(eq(tables.eventSeats.holdId, hold.id))

      await db
        .update(tables.orders)
        .set({
          status: 'cancelled',
          cancelledAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(tables.orders.holdId, hold.id),
          eq(tables.orders.status, 'pending'),
        ))

      await db
        .update(tables.seatHolds)
        .set({
          status: 'expired',
          releasedAt: now,
          updatedAt: now,
        })
        .where(eq(tables.seatHolds.id, hold.id))
    }

    return expiredHolds.length
  }
}

export default new HoldService()
