import type { Venue } from '#shared/db'
import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const response: Venue[] = await venueService.getList()
  return success(response)
})
