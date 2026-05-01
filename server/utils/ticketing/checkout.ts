import { and, eq } from 'drizzle-orm'
import { createPublicOrderId, createPublicTicketId, createQrToken } from '~~/server/utils/ticketing/ids'
import holdService from '~~/server/utils/ticketing/holds'
import analyticsService from '~~/server/utils/ticketing/analytics'

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
      const holdBundle = await holdService.getHoldWithSeats(holdPublicId)
      if (!holdBundle) {
        throw createError({ statusCode: 404, statusMessage: 'Seat hold not found.' })
      }

      const { hold, seats } = holdBundle
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

      await holdService.markCheckoutStarted(hold.id)

      return order
    })
  }

  async confirmCheckout(
    checkoutSessionId: string,
    holdPublicId: string,
    sessionKey: string,
    payload: {
      customerName: string
      customerEmail: string
      customerPhone?: string
      customerAgeBracket?: string
      customerGender?: string
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

    if (existingOrder.status === 'confirmed') {
      return this.getCheckoutByPublicId(existingOrder.publicId)
    }

    if (hold.status !== 'active' || hold.expiresAt.getTime() <= Date.now()) {
      throw createError({ statusCode: 409, statusMessage: 'Seat hold has expired.' })
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

      await tx
        .update(tables.seatHolds)
        .set({
          status: 'converted',
          updatedAt: now,
        })
        .where(eq(tables.seatHolds.id, hold.id))

      for (const seat of seats) {
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
            attendeeName: payload.customerName,
            attendeeEmail: payload.customerEmail,
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
