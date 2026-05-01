import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const events = await eventService.getList()
  return success(events)
})
