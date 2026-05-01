import holdService from '~~/server/utils/ticketing/holds'
import analyticsService from '~~/server/utils/ticketing/analytics'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const releasedCount = await holdService.expireStaleHolds()

  const events = await useDB().select().from(tables.events).all()
  for (const event of events) {
    await analyticsService.recomputeDailyBucket(event.id)
  }

  return success({
    result: 'Expired holds released',
    releasedCount,
    eventsRecomputed: events.length,
  })
})
