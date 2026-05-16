import { z } from 'zod'
import eventSessionService from '~~/server/utils/database/event-session'
import { apiError, success } from '~~/server/utils/apiResponse'
import { getTicketingSessionKey } from '~~/server/utils/ticketing/session'
import { requireSeatBookingAccess } from '~~/server/utils/ticketing/booking-access'
import type { SeatMapStatus, SessionSeatMapResponse } from '~~/types/seatmap'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'
import { resolveSessionSeatPrice } from '~~/server/utils/ticketing/pricing'
import { EventStatus, SeatStatus } from '#shared/commonEnums'
import holdService from '~~/server/utils/ticketing/holds'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'

const seatMapQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

function toSeatMapStatus(status: string): SeatMapStatus {
  switch (status) {
    case SeatStatus.Available:
    case SeatStatus.Locked:
    case SeatStatus.Sold:
    case SeatStatus.Unavailable:
      return status
    default:
      return SeatStatus.Unavailable
  }
}

function mapSeatMap(
  seatMap: Awaited<ReturnType<typeof eventSessionService.getSeatMap>>,
  version: number,
): SessionSeatMapResponse {
  const sectionById = new Map(seatMap.sections.map(section => [section.id, section]))
  const sectionPriceBySectionId = new Map(seatMap.sectionPrices.map(sectionPrice => [sectionPrice.venueSectionId, sectionPrice]))
  const seatOverrideBySeatId = new Map(seatMap.seatOverrides.map(seatOverride => [seatOverride.venueSeatId, seatOverride]))

  return {
    version,
    seats: seatMap.seats.map((seat) => {
      const section = typeof seat.venueSectionId === 'number' ? sectionById.get(seat.venueSectionId) : undefined
      const seatPricing = resolveSessionSeatPrice(seat, sectionPriceBySectionId, seatOverrideBySeatId)

      return {
        id: seat.id,
        venueSeatId: seat.venueSeatId,
        venueSectionId: seat.venueSectionId,
        ticketTypeId: seat.ticketTypeId,
        sectionKeySnapshot: section ? `section-${section.id}` : null,
        sectionCodeSnapshot: section?.code ?? null,
        sectionNameSnapshot: seat.sectionNameSnapshot,
        sectionColorSnapshot: section?.color ?? null,
        sectionGridXSnapshot: section?.gridX ?? null,
        sectionGridYSnapshot: section?.gridY ?? null,
        sectionGridWSnapshot: section?.gridW ?? null,
        sectionGridHSnapshot: section?.gridH ?? null,
        sectionSeatLayoutModeSnapshot: section?.seatLayoutMode ?? null,
        rowLabelSnapshot: seat.rowLabelSnapshot,
        seatLabelSnapshot: seat.seatLabelSnapshot,
        displayX: seat.displayX,
        displayY: seat.displayY,
        priceCents: seatPricing.priceCents,
        currency: seatPricing.currency,
        pricingSource: seatPricing.pricingSource,
        status: toSeatMapStatus(seat.status),
      }
    }),
    sectionPrices: seatMap.sectionPrices.map(sectionPrice => ({
      venueSectionId: sectionPrice.venueSectionId,
      sectionNameSnapshot: sectionPrice.sectionNameSnapshot,
      sectionColorSnapshot: sectionPrice.sectionColorSnapshot,
      priceCents: sectionPrice.priceCents,
      currency: sectionPrice.currency,
      sortOrder: sectionPrice.sortOrder,
    })),
    seatOverrides: seatMap.seatOverrides.map(seatOverride => ({
      venueSeatId: seatOverride.venueSeatId,
      venueSectionId: seatOverride.venueSectionId,
      priceCents: seatOverride.priceCents,
      currency: seatOverride.currency,
      isDisabled: seatOverride.isDisabled,
    })),
  }
}

export default defineEventHandler(async (event) => {
  const sessionPublicId = getRouterParam(event, 'sessionId')
  if (!sessionPublicId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_SESSION_ID', message: 'Session ID is required.' })
  }

  const session = await eventSessionService.getByPublicId(sessionPublicId)
  if (!session) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  if (session.status === EventStatus.Draft || session.status === EventStatus.Cancelled) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'SESSION_NOT_FOUND', message: 'Session not found.' })
  }

  await requireSeatBookingAccess(session.id, getTicketingSessionKey(event))

  await getValidatedQuery(event, rawQuery => seatMapQuerySchema.parse(rawQuery))
  const realtimeNamespace = getSeatmapRealtimeEnv(event).SEATMAP_REALTIME_ROOM
  await holdService.expireStaleHoldsForSession(session.id, realtimeNamespace)
  const seatMap = await eventSessionService.getSeatMap(session.id)
  const response: SessionSeatMapResponse = mapSeatMap({
    ...seatMap,
  }, session.seatmapVersion)
  return success(response)
})
