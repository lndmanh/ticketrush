import { and, desc, eq, gt } from 'drizzle-orm'
import type { CheckoutCancelData, CheckoutDetailData } from '~~/types/ticketing'
import type { CheckoutTicketHolderInput } from '#shared/schemas/ticketingSchema'
import type { SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'
import { createPublicOrderId, createPublicTicketId, createQrToken } from '~~/server/utils/ticketing/ids'
import holdService from '~~/server/utils/ticketing/holds'
import analyticsService from '~~/server/utils/ticketing/analytics'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'
import { requireCompleteSelfAttendee } from '~~/server/utils/ticketing/self-attendee-gate'
import { broadcastSeatStatusDelta, createSeatStatusChanges } from '~~/server/utils/ticketing/seatmap-realtime'
import type { SeatmapRealtimeNamespace } from '~~/server/utils/ticketing/seatmap-realtime'
import { HoldStatus, OrderStatus, SeatStatus, TicketHolderSource, TicketStatus } from '#shared/commonEnums'
import type { OrderPaymentMethod } from '#shared/commonEnums'

type EventSeatRow = typeof tables.eventSeats.$inferSelect
type SeatHoldItemRow = typeof tables.seatHoldItems.$inferSelect

interface TicketHolderSnapshot {
  eventSeatId: number
  savedAttendeeId: number | null
  attendeeName: string
  attendeeEmail: string
  attendeePhone: string | null
  attendeeBirthDate: Date | null
  attendeeGender: SavedAttendeeGender | null
  attendeeGuardianName: string | null
  attendeeGuardianEmail: string | null
  attendeeGuardianPhone: string | null
  attendeeNotes: string | null
  attendeeAccessibilityNeeds: string | null
}

interface HoldItemSnapshot {
  eventSeatId: number
  ticketTypeId: number | null
  ticketLabel: string
  sectionLabel: string
  rowLabel: string
  seatLabel: string
  unitPriceCents: number
  quantity: number
  currency: string
  pricingSource: SeatHoldItemRow['pricingSource']
  createdAt: Date
  updatedAt: Date
}

type CheckoutBundle = NonNullable<Awaited<ReturnType<typeof holdService.getHoldWithSeats>>>

function cleanText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null
  }

  const text = value.trim()
  return text ? text : null
}

function cleanOrFallback(value: string | null | undefined, fallback: string) {
  return cleanText(value) ?? fallback
}

class CheckoutService {
  private get db() {
    return useDB()
  }

  private buildHoldItemSnapshots(seats: EventSeatRow[], holdItems: SeatHoldItemRow[]): HoldItemSnapshot[] {
    const holdItemBySeatId = new Map(holdItems.map(item => [item.eventSeatId, item]))

    return seats.map((seat) => {
      const holdItem = holdItemBySeatId.get(seat.id)
      if (!holdItem) {
        throw createError({ statusCode: 400, statusMessage: 'Selected seat pricing could not be resolved.' })
      }

      return {
        eventSeatId: seat.id,
        ticketTypeId: seat.ticketTypeId,
        ticketLabel: `${seat.sectionNameSnapshot} ${seat.seatLabelSnapshot}`,
        sectionLabel: seat.sectionNameSnapshot,
        rowLabel: seat.rowLabelSnapshot,
        seatLabel: seat.seatLabelSnapshot,
        unitPriceCents: holdItem.priceCents,
        quantity: 1,
        currency: holdItem.currency,
        pricingSource: holdItem.pricingSource,
        createdAt: holdItem.createdAt,
        updatedAt: holdItem.updatedAt,
      }
    })
  }

  private isCompleteHoldBundle(bundle: CheckoutBundle) {
    if (bundle.hold.status !== HoldStatus.Active) {
      return false
    }

    if (bundle.seats.length === 0 || bundle.holdItems.length === 0) {
      return false
    }

    if (bundle.seats.length !== bundle.holdItems.length) {
      return false
    }

    const seatIds = new Set(bundle.seats.map(seat => seat.id))
    const holdItemSeatIds = new Set(bundle.holdItems.map(item => item.eventSeatId))

    if (seatIds.size !== bundle.seats.length || holdItemSeatIds.size !== bundle.holdItems.length) {
      return false
    }

    for (const seat of bundle.seats) {
      if (!holdItemSeatIds.has(seat.id)) {
        return false
      }
    }

    return true
  }

  private getCompleteHoldItemSnapshots(bundle: CheckoutBundle) {
    if (!this.isCompleteHoldBundle(bundle)) {
      return null
    }

    return this.buildHoldItemSnapshots(bundle.seats, bundle.holdItems)
  }

  private buildOrderItemInput(seat: EventSeatRow, holdItem: SeatHoldItemRow, orderId: number, now: Date) {
    return {
      orderId,
      eventSeatId: seat.id,
      ticketTypeId: seat.ticketTypeId,
      ticketLabel: `${seat.sectionNameSnapshot} ${seat.seatLabelSnapshot}`,
      sectionLabel: seat.sectionNameSnapshot,
      rowLabel: seat.rowLabelSnapshot,
      seatLabel: seat.seatLabelSnapshot,
      unitPriceCents: holdItem.priceCents,
      quantity: 1,
      createdAt: now,
      updatedAt: now,
    }
  }

  private async getOrderItemsBySeatId(orderId: number) {
    const items = await this.db
      .select()
      .from(tables.orderItems)
      .where(eq(tables.orderItems.orderId, orderId))
      .all()

    return new Map(items.map(item => [item.eventSeatId, item]))
  }

  private async getTicketsByOrderItemId(orderId: number) {
    const tickets = await this.db
      .select()
      .from(tables.tickets)
      .where(eq(tables.tickets.orderId, orderId))
      .all()

    return new Map(tickets.map(ticket => [ticket.orderItemId, ticket]))
  }

  async getCheckoutByPublicId(orderPublicId: string) {
    const order = await this.db
      .select()
      .from(tables.orders)
      .where(eq(tables.orders.publicId, orderPublicId))
      .get()

    if (!order) {
      return null
    }

    let items = await this.db
      .select()
      .from(tables.orderItems)
      .where(eq(tables.orderItems.orderId, order.id))
      .all()

    if (items.length === 0 && order.holdId) {
      const holdSeats = await this.db
        .select()
        .from(tables.eventSeats)
        .where(eq(tables.eventSeats.holdId, order.holdId))
        .all()

      const holdItems = await this.db
        .select()
        .from(tables.seatHoldItems)
        .where(eq(tables.seatHoldItems.holdId, order.holdId))
        .all()

      const hold = await this.db
        .select()
        .from(tables.seatHolds)
        .where(eq(tables.seatHolds.id, order.holdId))
        .get()

      const holdBundle = hold && hold.status === HoldStatus.Active
        ? { hold, seats: holdSeats, holdItems }
        : null

      const holdItemSnapshots = holdBundle ? this.getCompleteHoldItemSnapshots(holdBundle) : null
      if (!holdItemSnapshots) {
        throw createError({ statusCode: 400, statusMessage: 'Selected seat pricing could not be resolved.' })
      }

      items = holdItemSnapshots.map(snapshot => ({
        id: snapshot.eventSeatId,
        orderId: order.id,
        eventSeatId: snapshot.eventSeatId,
        ticketTypeId: snapshot.ticketTypeId,
        ticketLabel: snapshot.ticketLabel,
        sectionLabel: snapshot.sectionLabel,
        rowLabel: snapshot.rowLabel,
        seatLabel: snapshot.seatLabel,
        unitPriceCents: snapshot.unitPriceCents,
        pricingSource: snapshot.pricingSource,
        quantity: snapshot.quantity,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      }))
    }

    const tickets = await this.db
      .select()
      .from(tables.tickets)
      .where(eq(tables.tickets.orderId, order.id))
      .all()

    const hold = order.holdId
      ? await this.db
          .select()
          .from(tables.seatHolds)
          .where(eq(tables.seatHolds.id, order.holdId))
          .get()
      : null

    const event = await this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, order.eventId))
      .get()

    return {
      order,
      items,
      tickets,
      hold,
      event,
      eventSession: order.eventSessionId
        ? await this.db
            .select()
            .from(tables.eventSessions)
            .where(eq(tables.eventSessions.id, order.eventSessionId))
            .get()
        : null,
    }
  }

  async getActiveCheckoutForUser(userId: number) {
    const now = new Date()
    const pendingOrders = await this.db
      .select()
      .from(tables.orders)
      .where(and(
        eq(tables.orders.userId, userId),
        eq(tables.orders.status, 'pending'),
      ))
      .orderBy(desc(tables.orders.updatedAt))
      .all()

    for (const order of pendingOrders) {
      if (!order.holdId) {
        continue
      }

      const hold = await this.db
        .select()
        .from(tables.seatHolds)
        .where(and(
          eq(tables.seatHolds.id, order.holdId),
          eq(tables.seatHolds.status, 'active'),
          gt(tables.seatHolds.expiresAt, now),
        ))
        .get()

      if (!hold) {
        continue
      }

      return this.getCheckoutByPublicId(order.publicId)
    }

    return null
  }

  async cancelPendingCheckout(orderPublicId: string, userId: number, sessionKey: string, realtimeNamespace?: SeatmapRealtimeNamespace): Promise<CheckoutCancelData> {
    const checkout = await this.getCheckoutByPublicId(orderPublicId)
    const now = new Date()

    if (!checkout || checkout.order.userId !== userId) {
      throw createError({ statusCode: 404, statusMessage: 'Checkout not found.' })
    }

    if (checkout.order.status !== 'pending') {
      throw createError({ statusCode: 409, statusMessage: 'Only pending checkouts can be cancelled.' })
    }

    if (!checkout.hold) {
      throw createError({ statusCode: 409, statusMessage: 'Checkout hold could not be found.' })
    }

    if (checkout.hold.sessionKey !== sessionKey) {
      throw createError({ statusCode: 404, statusMessage: 'Checkout not found.' })
    }

    if (checkout.hold.status !== 'active' || checkout.hold.expiresAt.getTime() <= now.getTime()) {
      throw createError({ statusCode: 409, statusMessage: 'Checkout hold is no longer active.' })
    }

    const cancelledOrder = await this.db
      .update(tables.orders)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(tables.orders.id, checkout.order.id),
        eq(tables.orders.status, 'pending'),
      ))
      .returning()
      .get()

    if (!cancelledOrder) {
      throw createError({ statusCode: 409, statusMessage: 'Checkout is no longer pending.' })
    }

    const releasedHold = await holdService.releaseHold(checkout.hold.publicId, sessionKey, realtimeNamespace)

    return {
      order: cancelledOrder,
      hold: releasedHold,
    }
  }

  async startCheckout(holdPublicId: string, sessionKey: string, userId: number, realtimeNamespace?: SeatmapRealtimeNamespace) {
    const db = this.db
    const hold = await db.select().from(tables.seatHolds).where(eq(tables.seatHolds.publicId, holdPublicId)).get()

    if (!hold) {
      throw createError({ statusCode: 404, statusMessage: 'Seat hold not found.' })
    }

    if (hold.sessionKey !== sessionKey) {
      throw createError({ statusCode: 403, statusMessage: 'Seat hold does not belong to the current session.' })
    }

    if (hold.userId !== userId) {
      throw createError({ statusCode: 403, statusMessage: 'Seat hold does not belong to this user.' })
    }

    if (hold.status !== HoldStatus.Active || hold.expiresAt.getTime() <= Date.now()) {
      if (hold.status === HoldStatus.Active) {
        await holdService.expireStaleHoldByPublicId(holdPublicId, sessionKey, realtimeNamespace)
      }

      throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
    }

    const holdItems = await db
      .select()
      .from(tables.seatHoldItems)
      .where(eq(tables.seatHoldItems.holdId, hold.id))
      .all()

    const holdSeats = await db
      .select()
      .from(tables.eventSeats)
      .where(eq(tables.eventSeats.holdId, hold.id))
      .all()

    const holdBundle = { hold, seats: holdSeats, holdItems }
    const holdItemSnapshots = this.getCompleteHoldItemSnapshots(holdBundle)
    if (!holdItemSnapshots) {
      throw createError({ statusCode: 400, statusMessage: 'Selected seat pricing could not be resolved.' })
    }

    const amountCents = holdItemSnapshots.reduce((total, item) => total + item.unitPriceCents, 0)
    const currency = holdItemSnapshots[0].currency

    await requireCompleteSelfAttendee(userId)

    const existingOrder = await db.select().from(tables.orders).where(eq(tables.orders.holdId, hold.id)).get()
    if (existingOrder) {
      return existingOrder
    }

    let order: typeof tables.orders.$inferSelect | undefined
    try {
      order = await db
        .insert(tables.orders)
        .values({
          publicId: createPublicOrderId(),
          eventId: hold.eventId,
          eventSessionId: hold.eventSessionId,
          userId: hold.userId,
          holdId: hold.id,
          customerName: null,
          customerEmail: null,
          customerPhone: null,
          customerAgeBracket: null,
          customerGender: null,
          amountCents,
          currency,
          status: OrderStatus.Pending,
          checkoutSessionId: createPublicOrderId(),
          confirmedAt: null,
          cancelledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .get()
    }
    catch {
      const fallbackOrder = await db.select().from(tables.orders).where(eq(tables.orders.holdId, hold.id)).get()
      if (fallbackOrder) {
        return fallbackOrder
      }

      throw createError({ statusCode: 500, statusMessage: 'Failed to start checkout.' })
    }

    if (!order) {
      const fallbackOrder = await db.select().from(tables.orders).where(eq(tables.orders.holdId, hold.id)).get()
      if (fallbackOrder) {
        return fallbackOrder
      }

      throw createError({ statusCode: 500, statusMessage: 'Failed to start checkout.' })
    }

    await db
      .update(tables.seatHolds)
      .set({ checkoutStartedAt: new Date(), updatedAt: new Date() })
      .where(eq(tables.seatHolds.id, hold.id))

    return order
  }

  async confirmCheckout(
    checkoutSessionId: string,
    holdPublicId: string,
    sessionKey: string,
    payload: {
      userId: number
      customerName: string
      customerEmail: string
      customerPhone?: string
      customerAgeBracket?: string
      customerGender?: string
      payment: OrderPaymentMethod
      ticketHolders: CheckoutTicketHolderInput[]
    },
    realtimeNamespace?: SeatmapRealtimeNamespace,
  ) {
    const holdBundle = await holdService.getHoldWithSeats(holdPublicId)
    if (!holdBundle) {
      throw createError({ statusCode: 404, statusMessage: 'Seat hold not found.' })
    }

    const { hold, seats } = holdBundle
    if (hold.sessionKey !== sessionKey) {
      throw createError({ statusCode: 403, statusMessage: 'Seat hold does not belong to the current session.' })
    }

    const existingOrder = await this.db
      .select()
      .from(tables.orders)
      .where(eq(tables.orders.checkoutSessionId, checkoutSessionId))
      .get()

    if (!existingOrder) {
      throw createError({ statusCode: 404, statusMessage: 'Checkout session not found.' })
    }

    if (existingOrder.holdId !== hold.id || existingOrder.eventSessionId !== hold.eventSessionId) {
      throw createError({ statusCode: 403, statusMessage: 'Checkout session does not match this seat hold.' })
    }

    if (existingOrder.userId !== payload.userId) {
      throw createError({ statusCode: 403, statusMessage: 'Checkout session does not belong to this user.' })
    }

    if (existingOrder.status === OrderStatus.Confirmed) {
      return this.getCheckoutByPublicId(existingOrder.publicId)
    }

    if (hold.status !== HoldStatus.Active || hold.expiresAt.getTime() <= Date.now()) {
      if (hold.status === HoldStatus.Active) {
        await holdService.expireStaleHoldByPublicId(holdPublicId, sessionKey, realtimeNamespace)
      }

      throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
    }

    if (!this.isCompleteHoldBundle(holdBundle)) {
      throw createError({ statusCode: 400, statusMessage: 'Selected seat pricing could not be resolved.' })
    }

    const selfAttendee = await requireCompleteSelfAttendee(payload.userId)

    const holdItems = holdBundle.holdItems

    const amountCents = holdItems.reduce((total, item) => total + item.priceCents, 0)
    const currency = holdItems[0].currency

    const seatIds = new Set(seats.map(seat => seat.id))
    const holderSnapshots = new Map<number, TicketHolderSnapshot>()

    for (const assignment of payload.ticketHolders) {
      if (!seatIds.has(assignment.eventSeatId)) {
        throw createError({ statusCode: 400, statusMessage: 'Ticket holder assignments must match held seats.' })
      }

      if (holderSnapshots.has(assignment.eventSeatId)) {
        throw createError({ statusCode: 400, statusMessage: 'Duplicate ticket holder assignment.' })
      }

      if (assignment.source === TicketHolderSource.Account) {
        holderSnapshots.set(assignment.eventSeatId, {
          eventSeatId: assignment.eventSeatId,
          savedAttendeeId: selfAttendee.id,
          attendeeName: cleanOrFallback(selfAttendee.preferredName, selfAttendee.legalName),
          attendeeEmail: cleanOrFallback(selfAttendee.email, payload.customerEmail),
          attendeePhone: cleanText(selfAttendee.phone),
          attendeeBirthDate: selfAttendee.birthDate ?? null,
          attendeeGender: selfAttendee.gender ?? null,
          attendeeGuardianName: cleanText(selfAttendee.guardianName),
          attendeeGuardianEmail: cleanText(selfAttendee.guardianEmail),
          attendeeGuardianPhone: cleanText(selfAttendee.guardianPhone),
          attendeeNotes: cleanText(selfAttendee.notes),
          attendeeAccessibilityNeeds: cleanText(selfAttendee.accessibilityNeeds),
        })
        continue
      }

      if (assignment.source === TicketHolderSource.SavedAttendee) {
        if (!assignment.savedAttendeeId) {
          throw createError({ statusCode: 400, statusMessage: 'Choose a Saved Attendee' })
        }

        const savedAttendee = await savedAttendeeService.getForUser(assignment.savedAttendeeId, payload.userId)
        if (!savedAttendee) {
          throw createError({ statusCode: 404, statusMessage: 'Saved attendee not found.' })
        }

        holderSnapshots.set(assignment.eventSeatId, {
          eventSeatId: assignment.eventSeatId,
          savedAttendeeId: savedAttendee.id,
          attendeeName: cleanOrFallback(savedAttendee.preferredName, savedAttendee.legalName),
          attendeeEmail: cleanOrFallback(savedAttendee.email, payload.customerEmail),
          attendeePhone: cleanText(savedAttendee.phone),
          attendeeBirthDate: savedAttendee.birthDate ?? null,
          attendeeGender: savedAttendee.gender ?? null,
          attendeeGuardianName: cleanText(assignment.holder?.guardianName) ?? cleanText(savedAttendee.guardianName),
          attendeeGuardianEmail: cleanText(assignment.holder?.guardianEmail) ?? cleanText(savedAttendee.guardianEmail),
          attendeeGuardianPhone: cleanText(assignment.holder?.guardianPhone) ?? cleanText(savedAttendee.guardianPhone),
          attendeeNotes: cleanText(savedAttendee.notes),
          attendeeAccessibilityNeeds: cleanText(savedAttendee.accessibilityNeeds),
        })
        continue
      }

      if (!assignment.holder) {
        throw createError({ statusCode: 400, statusMessage: 'Ticket holder information is required.' })
      }

      holderSnapshots.set(assignment.eventSeatId, {
        eventSeatId: assignment.eventSeatId,
        savedAttendeeId: null,
        attendeeName: cleanOrFallback(assignment.holder.preferredName, assignment.holder.legalName),
        attendeeEmail: cleanOrFallback(assignment.holder.email, payload.customerEmail),
        attendeePhone: cleanText(assignment.holder.phone),
        attendeeBirthDate: assignment.holder.birthDate ?? null,
        attendeeGender: assignment.holder.gender ?? null,
        attendeeGuardianName: cleanText(assignment.holder.guardianName),
        attendeeGuardianEmail: cleanText(assignment.holder.guardianEmail),
        attendeeGuardianPhone: cleanText(assignment.holder.guardianPhone),
        attendeeNotes: cleanText(assignment.holder.notes),
        attendeeAccessibilityNeeds: cleanText(assignment.holder.accessibilityNeeds),
      })
    }

    if (holderSnapshots.size !== seats.length) {
      throw createError({ statusCode: 400, statusMessage: 'Assign a ticket holder to each ticket.' })
    }

    const now = new Date()

    const db = this.db
    const updatedOrder = await db
      .update(tables.orders)
      .set({
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone ?? null,
        customerAgeBracket: payload.customerAgeBracket ?? null,
        customerGender: payload.customerGender ?? null,
        amountCents,
        currency,
        payment: payload.payment,
        status: OrderStatus.Pending,
        confirmedAt: null,
        updatedAt: now,
      })
      .where(and(
        eq(tables.orders.id, existingOrder.id),
        eq(tables.orders.holdId, hold.id),
      ))
      .returning()
      .get()

    if (!updatedOrder) {
      throw createError({ statusCode: 409, statusMessage: 'Checkout session does not match this seat hold.' })
    }

    const existingItems = await this.getOrderItemsBySeatId(updatedOrder.id)
    const existingTickets = await this.getTicketsByOrderItemId(updatedOrder.id)

    const soldSeatIds: number[] = []

    for (const assignment of payload.ticketHolders) {
      if (!assignment.saveAsAttendee || !assignment.holder) {
        continue
      }

      const savedAttendee = await savedAttendeeService.createInTransaction(db, payload.userId, assignment.holder)
      const snapshot = holderSnapshots.get(assignment.eventSeatId)
      if (!snapshot) {
        throw createError({ statusCode: 400, statusMessage: 'Assign a ticket holder to each ticket.' })
      }

      holderSnapshots.set(assignment.eventSeatId, {
        ...snapshot,
        savedAttendeeId: savedAttendee.id,
      })
    }

    for (const seat of seats) {
      const holder = holderSnapshots.get(seat.id)
      if (!holder) {
        throw createError({ statusCode: 400, statusMessage: 'Assign a ticket holder to each ticket.' })
      }

      const holdItem = holdItems.find(item => item.eventSeatId === seat.id)
      if (!holdItem) {
        throw createError({ statusCode: 400, statusMessage: 'Selected seat pricing could not be resolved.' })
      }

      const soldSeat = await db
        .update(tables.eventSeats)
        .set({
          status: SeatStatus.Sold,
          orderId: updatedOrder.id,
          soldAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(tables.eventSeats.id, seat.id),
          eq(tables.eventSeats.holdId, hold.id),
          eq(tables.eventSeats.status, SeatStatus.Locked),
        ))
        .returning()
        .get()

      let soldSeatRow = soldSeat
      if (!soldSeatRow) {
        const currentSeat = await db.select().from(tables.eventSeats).where(eq(tables.eventSeats.id, seat.id)).get()
        if (!currentSeat || currentSeat.orderId !== updatedOrder.id) {
          throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
        }

        soldSeatRow = currentSeat
      }

      soldSeatIds.push(soldSeatRow.id)

      const orderItem = existingItems.get(seat.id) ?? await db
        .insert(tables.orderItems)
        .values(this.buildOrderItemInput(seat, holdItem, updatedOrder.id, now))
        .returning()
        .get()

      if (!orderItem) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create order item.' })
      }

      if (!existingTickets.has(orderItem.id)) {
        await db
          .insert(tables.tickets)
          .values({
            publicId: createPublicTicketId(),
            orderId: updatedOrder.id,
            orderItemId: orderItem.id,
            eventId: updatedOrder.eventId,
            eventSessionId: updatedOrder.eventSessionId,
            eventSeatId: seat.id,
            userId: updatedOrder.userId,
            savedAttendeeId: holder.savedAttendeeId,
            attendeeName: holder.attendeeName,
            attendeeEmail: holder.attendeeEmail,
            attendeePhone: holder.attendeePhone,
            attendeeBirthDate: holder.attendeeBirthDate,
            attendeeGender: holder.attendeeGender,
            attendeeGuardianName: holder.attendeeGuardianName,
            attendeeGuardianEmail: holder.attendeeGuardianEmail,
            attendeeGuardianPhone: holder.attendeeGuardianPhone,
            attendeeNotes: holder.attendeeNotes,
            attendeeAccessibilityNeeds: holder.attendeeAccessibilityNeeds,
            qrToken: createQrToken(orderItem.id.toString()),
            status: TicketStatus.Issued,
            issuedAt: now,
            checkedInAt: null,
            createdAt: now,
            updatedAt: now,
          })
      }
    }

    await db
      .update(tables.orders)
      .set({ status: OrderStatus.Confirmed, confirmedAt: now, updatedAt: now })
      .where(eq(tables.orders.id, updatedOrder.id))

    await db
      .update(tables.seatHolds)
      .set({ status: HoldStatus.Converted, updatedAt: now })
      .where(eq(tables.seatHolds.id, hold.id))

    const eventSession = hold.eventSessionId
      ? await db
          .select()
          .from(tables.eventSessions)
          .where(eq(tables.eventSessions.id, hold.eventSessionId))
          .get()
      : null

    if (eventSession) {
      await broadcastSeatStatusDelta(realtimeNamespace, {
        eventSessionId: eventSession.id,
        sessionPublicId: eventSession.publicId,
      }, createSeatStatusChanges(soldSeatIds, SeatStatus.Sold))
    }

    try {
      await analyticsService.recomputeDailyBucket(existingOrder.eventId)
    }
    catch (error) {
      console.error('Failed to recompute daily ticketing analytics.', error)
    }

    return this.getCheckoutByPublicId(existingOrder.publicId)
  }

  async listTicketsForUser(userId: number) {
    const tickets = await this.db
      .select()
      .from(tables.tickets)
      .where(eq(tables.tickets.userId, userId))
      .all()

    const enrichedTickets: Array<typeof tables.tickets.$inferSelect & {
      event: typeof tables.events.$inferSelect | null
      eventSession: typeof tables.eventSessions.$inferSelect | null
      orderItem: typeof tables.orderItems.$inferSelect | null
      order: typeof tables.orders.$inferSelect | null
    }> = []

    for (const ticket of tickets) {
      const event = await this.db
        .select()
        .from(tables.events)
        .where(eq(tables.events.id, ticket.eventId))
        .get()

      const eventSession = ticket.eventSessionId
        ? await this.db
            .select()
            .from(tables.eventSessions)
            .where(eq(tables.eventSessions.id, ticket.eventSessionId))
            .get()
        : null

      const orderItem = await this.db
        .select()
        .from(tables.orderItems)
        .where(eq(tables.orderItems.id, ticket.orderItemId))
        .get()

      const order = await this.db
        .select()
        .from(tables.orders)
        .where(eq(tables.orders.id, ticket.orderId))
        .get()

      enrichedTickets.push({
        ...ticket,
        event: event ?? null,
        eventSession,
        orderItem: orderItem ?? null,
        order: order ?? null,
      })
    }

    return enrichedTickets
  }

  async getTicketByPublicId(ticketPublicId: string, userId: number) {
    const ticket = await this.db
      .select()
      .from(tables.tickets)
      .where(eq(tables.tickets.publicId, ticketPublicId))
      .get()

    if (!ticket || ticket.userId !== userId) {
      return null
    }

    const order = await this.db
      .select()
      .from(tables.orders)
      .where(eq(tables.orders.id, ticket.orderId))
      .get()

    const event = await this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, ticket.eventId))
      .get()

    const eventSession = ticket.eventSessionId
      ? await this.db
          .select()
          .from(tables.eventSessions)
          .where(eq(tables.eventSessions.id, ticket.eventSessionId))
          .get()
      : null

    const orderItem = await this.db
      .select()
      .from(tables.orderItems)
      .where(eq(tables.orderItems.id, ticket.orderItemId))
      .get()

    return {
      ticket,
      order,
      event,
      eventSession,
      orderItem,
    }
  }
}

export default new CheckoutService()
