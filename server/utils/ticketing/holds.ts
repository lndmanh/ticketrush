import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { CreateSeatHoldInput } from '#shared/schemas/ticketingSchema'
import { createPublicHoldId } from '~~/server/utils/ticketing/ids'
import queueService from '~~/server/utils/ticketing/queue'
import eventSessionService from '~~/server/utils/database/event-session'
import { broadcastSeatStatusDelta, createSeatStatusChanges } from '~~/server/utils/ticketing/seatmap-realtime'
import type { SeatmapRealtimeNamespace } from '~~/server/utils/ticketing/seatmap-realtime'
import { EventStatus, HoldStatus, SeatPricingSource, SeatStatus } from '#shared/commonEnums'

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

    const holdItems = await this.db
      .select()
      .from(tables.seatHoldItems)
      .where(eq(tables.seatHoldItems.holdId, hold.id))
      .all()

    return {
      hold,
      seats,
      holdItems,
    }
  }

  private isCompleteHold(input: {
    hold: typeof tables.seatHolds.$inferSelect
    seats: typeof tables.eventSeats.$inferSelect[]
    holdItems: typeof tables.seatHoldItems.$inferSelect[]
    requestedSeatIds: number[]
  }) {
    if (input.hold.status !== HoldStatus.Active) {
      return false
    }

    if (input.seats.length !== input.requestedSeatIds.length) {
      return false
    }

    if (input.holdItems.length !== input.requestedSeatIds.length) {
      return false
    }

    const seatIds = new Set(input.seats.map(seat => seat.id))
    if (seatIds.size !== input.requestedSeatIds.length) {
      return false
    }

    for (const requestedSeatId of input.requestedSeatIds) {
      if (!seatIds.has(requestedSeatId)) {
        return false
      }
    }

    const holdItemSeatIds = new Set(input.holdItems.map(item => item.eventSeatId))
    if (holdItemSeatIds.size !== input.requestedSeatIds.length) {
      return false
    }

    for (const requestedSeatId of input.requestedSeatIds) {
      if (!holdItemSeatIds.has(requestedSeatId)) {
        return false
      }
    }

    return true
  }

  private async rollbackHold(holdId: number) {
    const now = new Date()
    await this.db.delete(tables.seatHoldItems).where(eq(tables.seatHoldItems.holdId, holdId))
    await this.db
      .update(tables.eventSeats)
      .set({
        status: SeatStatus.Available,
        holdId: null,
        lockedAt: null,
        updatedAt: now,
      })
      .where(eq(tables.eventSeats.holdId, holdId))
    await this.db.delete(tables.seatHolds).where(eq(tables.seatHolds.id, holdId))
  }

  async createHold(input: CreateSeatHoldInput & { sessionKey: string }, userId?: number, realtimeNamespace?: SeatmapRealtimeNamespace) {
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
    if (session.status !== EventStatus.Published && session.status !== EventStatus.OnSale) {
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
      const existingBundle = await this.getHoldWithSeats(existingHold.publicId)
      if (existingBundle && this.isCompleteHold({ ...existingBundle, requestedSeatIds: input.eventSeatIds })) {
        return existingBundle
      }

      throw createError({ statusCode: 409, statusMessage: 'An existing hold is incomplete for this idempotent request.' })
    }

    const expiresAt = new Date(Date.now() + HOLD_DURATION_MS)
    let holdPublicId: string | undefined
    let lockedSeatIds: number[] | undefined

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
          status: HoldStatus.Active,
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

      holdPublicId = hold.publicId

      const nextLockedSeatIds: number[] = []

      const availableSeats = await db
        .select()
        .from(tables.eventSeats)
        .where(and(
          eq(tables.eventSeats.eventSessionId, session.id),
          inArray(tables.eventSeats.id, input.eventSeatIds),
        ))
        .all()

      const sellableSeats = availableSeats.filter(seat => seat.status === SeatStatus.Available)
      if (sellableSeats.length !== input.eventSeatIds.length) {
        throw createError({ statusCode: 409, statusMessage: 'One or more selected seats are no longer available.' })
      }

      const pricingBundle = await eventSessionService.getSeatMap(session.id)
      const overrideByVenueSeatId = new Map(pricingBundle.seatOverrides.map(override => [override.venueSeatId, override]))

      for (const seat of sellableSeats) {
        const seatOverride = seat.venueSeatId === null ? undefined : overrideByVenueSeatId.get(seat.venueSeatId)
        if (seatOverride?.isDisabled) {
          throw createError({ statusCode: 409, statusMessage: 'One or more selected seats are no longer available.' })
        }
        const pricingSource = seatOverride?.priceCents === null || seatOverride === undefined ? SeatPricingSource.Section : SeatPricingSource.SeatOverride

        const lockedSeat = await db
          .update(tables.eventSeats)
          .set({
            status: SeatStatus.Locked,
            holdId: hold.id,
            lockedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(tables.eventSeats.id, seat.id),
            eq(tables.eventSeats.status, SeatStatus.Available),
            isNull(tables.eventSeats.holdId),
          ))
          .returning()
          .get()

        if (!lockedSeat) {
          throw createError({ statusCode: 409, statusMessage: 'One or more selected seats are no longer available.' })
        }

        await db
          .insert(tables.seatHoldItems)
          .values({
            holdId: hold.id,
            eventSeatId: lockedSeat.id,
            priceCents: lockedSeat.priceCents,
            currency: lockedSeat.currency,
            pricingSource,
            createdAt: now,
            updatedAt: now,
          })

        nextLockedSeatIds.push(lockedSeat.id)
      }

      await queueService.completeEntry(input.eventSessionId, input.sessionKey)

      lockedSeatIds = nextLockedSeatIds
    }
    catch (error) {
      if (holdPublicId) {
        const failedHold = await this.db
          .select()
          .from(tables.seatHolds)
          .where(eq(tables.seatHolds.publicId, holdPublicId))
          .get()

        if (failedHold) {
          await this.rollbackHold(failedHold.id)
        }
      }

      throw error
    }

    if (!holdPublicId || !lockedSeatIds) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to create seat hold.' })
    }

    await broadcastSeatStatusDelta(realtimeNamespace, {
      eventSessionId: session.id,
      sessionPublicId: session.publicId,
    }, createSeatStatusChanges(lockedSeatIds, SeatStatus.Locked))

    return this.getHoldWithSeats(holdPublicId)
  }

  async releaseHold(holdPublicId: string, sessionKey: string, realtimeNamespace?: SeatmapRealtimeNamespace) {
    const hold = await this.db
      .select()
      .from(tables.seatHolds)
      .where(eq(tables.seatHolds.publicId, holdPublicId))
      .get()

    if (!hold || hold.sessionKey !== sessionKey) {
      throw createError({ statusCode: 404, statusMessage: 'Seat hold not found.' })
    }

    if (hold.status !== HoldStatus.Active) {
      return hold
    }

    const now = new Date()
    const releasedHold = await this.db
      .update(tables.seatHolds)
      .set({
        status: HoldStatus.Released,
        releasedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(tables.seatHolds.id, hold.id),
        eq(tables.seatHolds.status, HoldStatus.Active),
      ))
      .returning()
      .get()

    if (!releasedHold) {
      return (await this.getHoldByPublicId(holdPublicId)) ?? hold
    }

    const releasedSeats = await this.db
      .update(tables.eventSeats)
      .set({
        status: SeatStatus.Available,
        holdId: null,
        lockedAt: null,
        updatedAt: now,
      })
      .where(and(
        eq(tables.eventSeats.holdId, hold.id),
        eq(tables.eventSeats.status, SeatStatus.Locked),
      ))
      .returning({ id: tables.eventSeats.id })

    if (hold.eventSessionId && releasedSeats.length > 0) {
      const session = await eventSessionService.getById(hold.eventSessionId)
      if (session) {
        await broadcastSeatStatusDelta(realtimeNamespace, {
          eventSessionId: session.id,
          sessionPublicId: session.publicId,
        }, createSeatStatusChanges(releasedSeats.map(seat => seat.id), SeatStatus.Available))
      }
    }

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

  async expireStaleHolds(realtimeNamespace?: SeatmapRealtimeNamespace) {
    const now = new Date()
    const holds = await this.db
      .select()
      .from(tables.seatHolds)
      .all()

    const expiredHolds = holds.filter(hold => hold.status === HoldStatus.Active && hold.expiresAt.getTime() <= now.getTime())
    const sessionIds = Array.from(new Set(expiredHolds.map(hold => hold.eventSessionId).filter((eventSessionId): eventSessionId is number => eventSessionId !== null)))
    const sessionsById = new Map<number, { id: number, publicId: string }>()

    for (const eventSessionId of sessionIds) {
      const session = await eventSessionService.getById(eventSessionId)
      if (session) {
        sessionsById.set(session.id, {
          id: session.id,
          publicId: session.publicId,
        })
      }
    }

    const releasedSeatIdsBySessionPublicId = new Map<string, { seatIds: number[], sessionId: number }>()

    for (const hold of expiredHolds) {
      const releasedHold = await this.db
        .update(tables.seatHolds)
        .set({
          status: HoldStatus.Expired,
          releasedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(tables.seatHolds.id, hold.id),
          eq(tables.seatHolds.status, HoldStatus.Active),
          eq(tables.seatHolds.expiresAt, hold.expiresAt),
        ))
        .returning()
        .get()

      if (!releasedHold) {
        continue
      }

      const releasedSeats = await this.db
        .update(tables.eventSeats)
        .set({
          status: SeatStatus.Available,
          holdId: null,
          lockedAt: null,
          updatedAt: now,
        })
        .where(and(
          eq(tables.eventSeats.holdId, hold.id),
          eq(tables.eventSeats.status, SeatStatus.Locked),
        ))
        .returning({ id: tables.eventSeats.id })

      if (hold.eventSessionId && releasedSeats.length > 0) {
        const session = sessionsById.get(hold.eventSessionId)
        if (session) {
          const existing = releasedSeatIdsBySessionPublicId.get(session.publicId)
          const nextSeatIds = existing ? existing.seatIds : []
          nextSeatIds.push(...releasedSeats.map(seat => seat.id))
          releasedSeatIdsBySessionPublicId.set(session.publicId, {
            seatIds: nextSeatIds,
            sessionId: session.id,
          })
        }
      }
    }

    for (const [sessionPublicId, value] of releasedSeatIdsBySessionPublicId.entries()) {
      await broadcastSeatStatusDelta(realtimeNamespace, {
        eventSessionId: value.sessionId,
        sessionPublicId,
      }, createSeatStatusChanges(value.seatIds, SeatStatus.Available))
    }

    return expiredHolds.length
  }
}

export default new HoldService()
