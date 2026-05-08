import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const cities = await eventService.getEventCatalogCities()
  const response: Awaited<ReturnType<typeof eventService.getEventCatalogCities>> = cities
  return success(response)
})
