import type { AdminEventWorkspaceDashboard } from '~~/types/admin-events'
import analyticsService from '~~/server/utils/ticketing/analytics'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(eventId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const overview = await analyticsService.getAdminOverview(eventId)
  const response: AdminEventWorkspaceDashboard = {
    revenueCents: overview.revenueCents,
    soldSeatsCount: overview.soldSeatsCount,
    availableSeatsCount: overview.availableSeatsCount,
    activeHoldsCount: overview.activeHoldsCount,
    queueWaitingCount: overview.queueWaitingCount,
    queueAdmittedCount: overview.queueAdmittedCount,
    occupancyRate: overview.occupancyRate,
    salesBySection: overview.salesBySection,
    ageDistribution: overview.ageDistribution,
    genderDistribution: overview.genderDistribution,
    recentOrders: overview.recentOrders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amountCents: order.amountCents,
      confirmedAt: order.confirmedAt,
    })),
  }

  return success(response)
})
