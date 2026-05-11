import { eq } from 'drizzle-orm'
import { AgeBracket, HoldStatus, OrderStatus, QueueStatus, SavedAttendeeGender, SeatStatus } from '#shared/commonEnums'

class AnalyticsService {
  private get db() {
    return useDB()
  }

  private getTime(value: Date | null | undefined) {
    return value ? new Date(value).getTime() : 0
  }

  private buildOverview(entity: typeof tables.events.$inferSelect | typeof tables.eventSessions.$inferSelect, seats: typeof tables.eventSeats.$inferSelect[], orders: typeof tables.orders.$inferSelect[], queueEntries: typeof tables.queueEntries.$inferSelect[]) {
    const confirmedOrders = orders.filter(order => order.status === OrderStatus.Confirmed)
    const activeHolds = seats.filter(seat => seat.status === SeatStatus.Locked)
    const soldSeats = seats.filter(seat => seat.status === SeatStatus.Sold)
    const availableSeats = seats.filter(seat => seat.status === SeatStatus.Available)

    const salesBySection = soldSeats.reduce<Record<string, { sold: number, revenueCents: number }>>((accumulator, seat) => {
      const current = accumulator[seat.sectionNameSnapshot] ?? { sold: 0, revenueCents: 0 }
      current.sold += 1
      current.revenueCents += seat.priceCents
      accumulator[seat.sectionNameSnapshot] = current
      return accumulator
    }, {})

    const ageDistribution = confirmedOrders.reduce<Record<string, number>>((accumulator, order) => {
      const key = order.customerAgeBracket === AgeBracket.EighteenToTwentyFour
        ? AgeBracket.EighteenToTwentyFour
        : order.customerAgeBracket === AgeBracket.TwentyFiveToThirtyFour
          ? AgeBracket.TwentyFiveToThirtyFour
          : order.customerAgeBracket === AgeBracket.ThirtyFiveToFortyFour
            ? AgeBracket.ThirtyFiveToFortyFour
            : order.customerAgeBracket === AgeBracket.FortyFivePlus
              ? AgeBracket.FortyFivePlus
              : 'unknown'
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    const genderDistribution = confirmedOrders.reduce<Record<string, number>>((accumulator, order) => {
      const key = order.customerGender === SavedAttendeeGender.Female
        ? SavedAttendeeGender.Female
        : order.customerGender === SavedAttendeeGender.Male
          ? SavedAttendeeGender.Male
          : order.customerGender === SavedAttendeeGender.NonBinary
            ? SavedAttendeeGender.NonBinary
            : order.customerGender === SavedAttendeeGender.PreferNotToSay
              ? SavedAttendeeGender.PreferNotToSay
              : 'unknown'
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    return {
      event: entity,
      revenueCents: confirmedOrders.reduce((total, order) => total + order.amountCents, 0),
      soldSeatsCount: soldSeats.length,
      availableSeatsCount: availableSeats.length,
      activeHoldsCount: activeHolds.length,
      queueWaitingCount: queueEntries.filter(entry => entry.status === QueueStatus.Waiting).length,
      queueAdmittedCount: queueEntries.filter(entry => entry.status === QueueStatus.Admitted).length,
      occupancyRate: seats.length > 0 ? soldSeats.length / seats.length : 0,
      salesBySection,
      ageDistribution,
      genderDistribution,
      recentOrders: confirmedOrders.slice(-5).reverse(),
    }
  }

  async getSessionOverview(eventSessionId: number) {
    const session = await this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.id, eventSessionId))
      .get()

    if (!session) {
      throw createError({ statusCode: 404, statusMessage: 'Event session not found.' })
    }

    const [seats, orders, queueEntries] = await Promise.all([
      this.db
        .select()
        .from(tables.eventSeats)
        .where(eq(tables.eventSeats.eventSessionId, eventSessionId))
        .all(),
      this.db
        .select()
        .from(tables.orders)
        .where(eq(tables.orders.eventSessionId, eventSessionId))
        .all(),
      this.db
        .select()
        .from(tables.queueEntries)
        .where(eq(tables.queueEntries.eventSessionId, eventSessionId))
        .all(),
    ])

    return {
      ...this.buildOverview(session, seats, orders, queueEntries),
      session,
    }
  }

  async getAdminOverview(eventId: number) {
    const event = await this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, eventId))
      .get()

    if (!event) {
      throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
    }

    const sessions = await this.db
      .select()
      .from(tables.eventSessions)
      .where(eq(tables.eventSessions.eventId, eventId))
      .all()

    const [seats, orders, queueEntries] = await Promise.all([
      this.db
        .select()
        .from(tables.eventSeats)
        .where(eq(tables.eventSeats.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.orders)
        .where(eq(tables.orders.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.queueEntries)
        .where(eq(tables.queueEntries.eventId, eventId))
        .all(),
    ])

    return {
      ...this.buildOverview(event, seats, orders, queueEntries),
      sessions,
    }
  }

  async getAdminOps(eventId: number) {
    const event = await this.db
      .select()
      .from(tables.events)
      .where(eq(tables.events.id, eventId))
      .get()

    if (!event) {
      throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
    }

    const [orders, orderItems, tickets, queueEntries, holds, seats] = await Promise.all([
      this.db
        .select()
        .from(tables.orders)
        .where(eq(tables.orders.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.orderItems)
        .all(),
      this.db
        .select()
        .from(tables.tickets)
        .where(eq(tables.tickets.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.queueEntries)
        .where(eq(tables.queueEntries.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.seatHolds)
        .where(eq(tables.seatHolds.eventId, eventId))
        .all(),
      this.db
        .select()
        .from(tables.eventSeats)
        .where(eq(tables.eventSeats.eventId, eventId))
        .all(),
    ])

    const itemsByOrderId = new Map<number, typeof orderItems>()
    for (const item of orderItems.filter(orderItem => orders.some(order => order.id === orderItem.orderId))) {
      const existingItems = itemsByOrderId.get(item.orderId) ?? []
      existingItems.push(item)
      itemsByOrderId.set(item.orderId, existingItems)
    }

    const seatsByHoldId = new Map<number, typeof seats>()
    for (const seat of seats.filter(candidate => candidate.holdId !== null)) {
      const holdId = seat.holdId
      if (holdId === null) {
        continue
      }

      const existingSeats = seatsByHoldId.get(holdId) ?? []
      existingSeats.push(seat)
      seatsByHoldId.set(holdId, existingSeats)
    }

    const eventSeatById = new Map(seats.map(seat => [seat.id, seat]))
    const orderById = new Map(orders.map(order => [order.id, order]))
    const orderItemById = new Map(orderItems.map(orderItem => [orderItem.id, orderItem]))

    const recentOrders = [...orders]
      .sort((left, right) => {
        const leftTime = left.confirmedAt ? this.getTime(left.confirmedAt) : this.getTime(left.createdAt)
        const rightTime = right.confirmedAt ? this.getTime(right.confirmedAt) : this.getTime(right.createdAt)
        return rightTime - leftTime
      })
      .slice(0, 8)
      .map(order => ({
        ...order,
        seatLabels: (itemsByOrderId.get(order.id) ?? []).map(item => item.seatLabel).filter(Boolean),
        ticketLabels: (itemsByOrderId.get(order.id) ?? []).map(item => item.ticketLabel),
      }))

    const recentTickets = [...tickets]
      .sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime())
      .slice(0, 8)
      .map((ticket) => {
        const order = orderById.get(ticket.orderId) ?? null
        const orderItem = orderItemById.get(ticket.orderItemId) ?? null
        const eventSeat = ticket.eventSeatId ? eventSeatById.get(ticket.eventSeatId) ?? null : null

        return {
          ...ticket,
          customerName: order?.customerName ?? null,
          customerEmail: order?.customerEmail ?? null,
          seatLabel: orderItem?.seatLabel ?? eventSeat?.seatLabelSnapshot ?? null,
          sectionLabel: orderItem?.sectionLabel ?? eventSeat?.sectionNameSnapshot ?? null,
          rowLabel: orderItem?.rowLabel ?? eventSeat?.rowLabelSnapshot ?? null,
        }
      })

    const activeHolds = holds
      .filter(hold => hold.status === HoldStatus.Active)
      .sort((left, right) => this.getTime(left.expiresAt) - this.getTime(right.expiresAt))
      .slice(0, 8)
      .map(hold => ({
        ...hold,
        seatCount: (seatsByHoldId.get(hold.id) ?? []).length,
        seatLabels: (seatsByHoldId.get(hold.id) ?? []).slice(0, 6).map(seat => `${seat.sectionNameSnapshot}-${seat.rowLabelSnapshot ?? 'GA'}-${seat.seatLabelSnapshot}`),
      }))

    const queueFeed = [...queueEntries]
      .sort((left, right) => {
        const rightTime = this.getTime(right.createdAt)
        const leftTime = this.getTime(left.createdAt)
        return rightTime - leftTime
      })
      .slice(0, 8)

    const seatActivity = [...seats]
      .filter(seat => seat.status !== SeatStatus.Available)
      .sort((left, right) => {
        const rightTime = this.getTime(right.updatedAt)
        const leftTime = this.getTime(left.updatedAt)
        return rightTime - leftTime
      })
      .slice(0, 10)

    return {
      event,
      totals: {
        ordersCount: orders.length,
        ticketsCount: tickets.length,
        activeHoldsCount: holds.filter(hold => hold.status === HoldStatus.Active).length,
        queueEntriesCount: queueEntries.length,
      },
      recentOrders,
      recentTickets,
      activeHolds,
      queueFeed,
      seatActivity,
    }
  }

  private async upsertDailyBucket(eventId: number, eventSessionId: number | null, overview: Awaited<ReturnType<AnalyticsService['getAdminOverview']>> | Awaited<ReturnType<AnalyticsService['getSessionOverview']>>) {
    const bucketDate = new Date().toISOString().slice(0, 10)
    const now = new Date()

    const existing = await this.db
      .select()
      .from(tables.eventMetricBuckets)
      .where(eq(tables.eventMetricBuckets.eventId, eventId))
      .all()
      .then(rows => rows.find(row => row.bucketDate === bucketDate && row.eventSessionId === eventSessionId))

    const payload = {
      eventId,
      eventSessionId,
      bucketDate,
      soldTicketsCount: overview.soldSeatsCount,
      revenueCents: overview.revenueCents,
      activeHoldsCount: overview.activeHoldsCount,
      queuedUsersCount: overview.queueWaitingCount + overview.queueAdmittedCount,
      age18To24Count: overview.ageDistribution[AgeBracket.EighteenToTwentyFour] ?? 0,
      age25To34Count: overview.ageDistribution[AgeBracket.TwentyFiveToThirtyFour] ?? 0,
      age35To44Count: overview.ageDistribution[AgeBracket.ThirtyFiveToFortyFour] ?? 0,
      age45PlusCount: overview.ageDistribution[AgeBracket.FortyFivePlus] ?? 0,
      femaleCount: overview.genderDistribution[SavedAttendeeGender.Female] ?? 0,
      maleCount: overview.genderDistribution[SavedAttendeeGender.Male] ?? 0,
      nonBinaryCount: overview.genderDistribution[SavedAttendeeGender.NonBinary] ?? 0,
      undisclosedCount: overview.genderDistribution[SavedAttendeeGender.PreferNotToSay] ?? 0,
      updatedAt: now,
    }

    if (existing) {
      return this.db
        .update(tables.eventMetricBuckets)
        .set(payload)
        .where(eq(tables.eventMetricBuckets.id, existing.id))
        .returning()
        .get()
    }

    return this.db
      .insert(tables.eventMetricBuckets)
      .values({
        ...payload,
        createdAt: now,
      })
      .returning()
      .get()
  }

  async recomputeDailyBucket(eventId: number) {
    const overview = await this.getAdminOverview(eventId)
    return this.upsertDailyBucket(eventId, null, overview)
  }

  async recomputeSessionDailyBucket(eventSessionId: number) {
    const overview = await this.getSessionOverview(eventSessionId)
    return this.upsertDailyBucket(overview.session.eventId, overview.session.id, overview)
  }
}

export default new AnalyticsService()
