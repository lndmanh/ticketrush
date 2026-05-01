import analyticsService from '~~/server/utils/ticketing/analytics'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const eventId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(eventId)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. Event ID is invalid.' })
  }

  const overview = await analyticsService.getAdminOps(eventId)
  return success(overview)
})
