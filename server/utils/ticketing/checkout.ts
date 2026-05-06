import { and, eq } from 'drizzle-orm'
import type { CheckoutTicketHolderInput } from '#shared/schemas/ticketingSchema'
import type { SavedAttendeeGender } from '#shared/schemas/savedAttendeeSchema'
import { createPublicOrderId, createPublicTicketId, createQrToken } from '~~/server/utils/ticketing/ids'
import holdService from '~~/server/utils/ticketing/holds'
import analyticsService from '~~/server/utils/ticketing/analytics'
import savedAttendeeService from '~~/server/utils/database/savedAttendee'

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

      items = holdSeats.map(seat => ({
        id: seat.id,
        orderId: order.id,
        eventSeatId: seat.id,
        ticketTypeId: seat.ticketTypeId,
        ticketLabel: `${seat.sectionNameSnapshot} ${seat.seatLabelSnapshot}`,
        sectionLabel: seat.sectionNameSnapshot,
        rowLabel: seat.rowLabelSnapshot,
        seatLabel: seat.seatLabelSnapshot,
        unitPriceCents: seat.priceCents,
        quantity: 1,
        createdAt: seat.createdAt,
        updatedAt: seat.updatedAt,
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

  async startCheckout(holdPublicId: string, sessionKey: string) {
    return this.db.transaction(async (tx) => {
      const hold = await tx
        .select()
        .from(tables.seatHolds)
        .where(eq(tables.seatHolds.publicId, holdPublicId))
        .get()

      if (!hold) {
        throw createError({ statusCode: 404, statusMessage: 'Seat hold not found.' })
      }

      const seats = await tx
        .select()
        .from(tables.eventSeats)
        .where(eq(tables.eventSeats.holdId, hold.id))
        .all()

      if (hold.sessionKey !== sessionKey) {
        throw createError({ statusCode: 403, statusMessage: 'Seat hold does not belong to the current session.' })
      }

      if (hold.status !== 'active' || hold.expiresAt.getTime() <= Date.now()) {
        throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
      }

      const existingOrder = await tx
        .select()
        .from(tables.orders)
        .where(eq(tables.orders.holdId, hold.id))
        .get()

      if (existingOrder) {
        return existingOrder
      }

      const amountCents = seats.reduce((total, seat) => total + seat.priceCents, 0)

      let order: typeof tables.orders.$inferSelect | undefined
      try {
        order = await tx
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
            currency: seats[0]?.currency ?? 'VND',
            status: 'pending',
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
        const existingOrder = await tx
          .select()
          .from(tables.orders)
          .where(eq(tables.orders.holdId, hold.id))
          .get()

        if (existingOrder) {
          return existingOrder
        }

        throw createError({ statusCode: 500, statusMessage: 'Failed to start checkout.' })
      }

      if (!order) {
        const existingOrder = await tx
          .select()
          .from(tables.orders)
          .where(eq(tables.orders.holdId, hold.id))
          .get()

        if (existingOrder) {
          return existingOrder
        }

        throw createError({ statusCode: 500, statusMessage: 'Failed to start checkout.' })
      }

      await tx
        .update(tables.seatHolds)
        .set({
          checkoutStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tables.seatHolds.id, hold.id))

      return order
    })
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
      ticketHolders: CheckoutTicketHolderInput[]
    },
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

    if (existingOrder.status === 'confirmed') {
      return this.getCheckoutByPublicId(existingOrder.publicId)
    }

    if (hold.status !== 'active' || hold.expiresAt.getTime() <= Date.now()) {
      throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
    }

    const seatIds = new Set(seats.map(seat => seat.id))
    const holderSnapshots = new Map<number, TicketHolderSnapshot>()

    for (const assignment of payload.ticketHolders) {
      if (!seatIds.has(assignment.eventSeatId)) {
        throw createError({ statusCode: 400, statusMessage: 'Ticket holder assignments must match held seats.' })
      }

      if (holderSnapshots.has(assignment.eventSeatId)) {
        throw createError({ statusCode: 400, statusMessage: 'Duplicate ticket holder assignment.' })
      }

      if (assignment.source === 'saved-attendee') {
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
          attendeeGuardianName: cleanText(savedAttendee.guardianName),
          attendeeGuardianEmail: cleanText(savedAttendee.guardianEmail),
          attendeeGuardianPhone: cleanText(savedAttendee.guardianPhone),
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

    await this.db.transaction(async (tx) => {
      const updatedOrder = await tx
        .update(tables.orders)
        .set({
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone ?? null,
          customerAgeBracket: payload.customerAgeBracket ?? null,
          customerGender: payload.customerGender ?? null,
          status: 'confirmed',
          confirmedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(tables.orders.id, existingOrder.id),
          eq(tables.orders.holdId, hold.id),
          eq(tables.orders.status, 'pending'),
        ))
        .returning()
        .get()

      if (!updatedOrder) {
        const currentCheckout = await this.getCheckoutByPublicId(existingOrder.publicId)
        if (currentCheckout?.order.status === 'confirmed') {
          return currentCheckout
        }

        throw createError({ statusCode: 409, statusMessage: 'Checkout session does not match this seat hold.' })
      }

      for (const assignment of payload.ticketHolders) {
        if (!assignment.saveAsAttendee || !assignment.holder) {
          continue
        }

        const savedAttendee = await savedAttendeeService.createInTransaction(tx, payload.userId, assignment.holder)
        const snapshot = holderSnapshots.get(assignment.eventSeatId)
        if (!snapshot) {
          throw createError({ statusCode: 400, statusMessage: 'Assign a ticket holder to each ticket.' })
        }

        holderSnapshots.set(assignment.eventSeatId, {
          ...snapshot,
          savedAttendeeId: savedAttendee.id,
        })
      }

      await tx
        .update(tables.seatHolds)
        .set({
          status: 'converted',
          updatedAt: now,
        })
        .where(eq(tables.seatHolds.id, hold.id))

      for (const seat of seats) {
        const holder = holderSnapshots.get(seat.id)
        if (!holder) {
          throw createError({ statusCode: 400, statusMessage: 'Assign a ticket holder to each ticket.' })
        }

        const soldSeat = await tx
          .update(tables.eventSeats)
          .set({
            status: 'sold',
            orderId: updatedOrder.id,
            soldAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(tables.eventSeats.id, seat.id),
            eq(tables.eventSeats.holdId, hold.id),
            eq(tables.eventSeats.status, 'locked'),
          ))
          .returning()
          .get()

        if (!soldSeat) {
          throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
        }

        const orderItem = await tx
          .insert(tables.orderItems)
          .values({
            orderId: updatedOrder.id,
            eventSeatId: seat.id,
            ticketTypeId: seat.ticketTypeId,
            ticketLabel: `${seat.sectionNameSnapshot} ${seat.seatLabelSnapshot}`,
            sectionLabel: seat.sectionNameSnapshot,
            rowLabel: seat.rowLabelSnapshot,
            seatLabel: seat.seatLabelSnapshot,
            unitPriceCents: seat.priceCents,
            quantity: 1,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
          .get()

        if (!orderItem) {
          throw createError({ statusCode: 500, statusMessage: 'Failed to create order item.' })
        }

        await tx
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
            status: 'issued',
            issuedAt: now,
            checkedInAt: null,
            createdAt: now,
            updatedAt: now,
          })
      }
    })

    await analyticsService.recomputeDailyBucket(existingOrder.eventId)

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
