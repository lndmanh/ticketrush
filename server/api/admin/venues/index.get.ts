import venueService from '~~/server/utils/database/venue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const venues = await venueService.getList()
  return success(venues)
})
