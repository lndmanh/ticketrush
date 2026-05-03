import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const cities = await eventService.getEventCatalogCities()
  return success(cities)
})
