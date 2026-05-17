import { seedDemoTicketingData } from '~~/server/tasks/db/demo-ticketing'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const response = await seedDemoTicketingData()
  return success(response)
})
