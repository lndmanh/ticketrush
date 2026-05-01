import holdService from '~~/server/utils/ticketing/holds'
import analyticsService from '~~/server/utils/ticketing/analytics'

export default defineTask({
  meta: {
    name: 'ticketing:release-expired-holds',
    description: 'Release expired seat holds and refresh analytics buckets',
  },
  async run() {
    const releasedCount = await holdService.expireStaleHolds()
    const db = useDB()
    const events = await db.select().from(tables.events).all()
    const sessions = await db.select().from(tables.eventSessions).all()

    for (const event of events) {
      await analyticsService.recomputeDailyBucket(event.id)
    }

    for (const session of sessions) {
      await analyticsService.recomputeSessionDailyBucket(session.id)
    }

    return {
      result: 'Expired holds released',
      releasedCount,
    }
  },
})
