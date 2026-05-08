import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const locations = await eventService.getEventCatalogLocationOptions()
  return success(locations)
})
