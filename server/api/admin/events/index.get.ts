import type { Event } from '#shared/db'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const response: Event[] = await eventService.getList()
  return success(response)
})
