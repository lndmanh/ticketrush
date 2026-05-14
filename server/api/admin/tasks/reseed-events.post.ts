import { success } from '~~/server/utils/apiResponse'
import { reseedDemoEvents } from '~~/server/utils/database/demo-events'

export default defineEventHandler(async () => {
  const result = await reseedDemoEvents()
  console.log(`Reseeded ${result.eventsCreated} demo events across ${result.venuesCreated} venues.`)

  return success(result)
})
