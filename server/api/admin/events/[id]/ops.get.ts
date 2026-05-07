import type { AdminEventWorkspaceOps } from '~~/types/admin-events'
import analyticsService from '~~/server/utils/ticketing/analytics'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(eventId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const overview = await analyticsService.getAdminOps(eventId)
  const response: AdminEventWorkspaceOps = {
    totals: overview.totals,
    recentOrders: overview.recentOrders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amountCents: order.amountCents,
      confirmedAt: order.confirmedAt,
      seatLabels: order.seatLabels.filter((label): label is string => typeof label === 'string'),
      ticketLabels: order.ticketLabels,
    })),
    recentTickets: overview.recentTickets.map(ticket => ({
      id: ticket.id,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      checkedInAt: ticket.checkedInAt,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      seatLabel: ticket.seatLabel,
      sectionLabel: ticket.sectionLabel,
      rowLabel: ticket.rowLabel,
    })),
    activeHolds: overview.activeHolds.map(hold => ({
      id: hold.id,
      publicId: hold.publicId,
      status: hold.status,
      expiresAt: hold.expiresAt,
      seatCount: hold.seatCount,
      seatLabels: hold.seatLabels,
    })),
    queueFeed: overview.queueFeed.map(entry => ({
      id: entry.id,
      customerKey: entry.customerKey,
      status: entry.status,
      admittedAt: entry.admittedAt,
      expiresAt: entry.expiresAt,
      createdAt: entry.createdAt,
    })),
    seatActivity: overview.seatActivity.map(seat => ({
      id: seat.id,
      sectionNameSnapshot: seat.sectionNameSnapshot,
      rowLabelSnapshot: seat.rowLabelSnapshot,
      seatLabelSnapshot: seat.seatLabelSnapshot,
      displayX: seat.displayX,
      displayY: seat.displayY,
      status: seat.status,
      priceCents: seat.priceCents,
      currency: seat.currency,
      updatedAt: seat.updatedAt,
    })),
  }

  return success(response)
})
