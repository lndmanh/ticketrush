import type { ReleaseHoldsTaskData } from '~~/types/admin-tasks'
import holdService from '~~/server/utils/ticketing/holds'
import analyticsService from '~~/server/utils/ticketing/analytics'
import { success } from '~~/server/utils/apiResponse'
import { getSeatmapRealtimeEnv } from '~~/server/utils/ticketing/seatmap-realtime'

export default defineEventHandler(async (event) => {
  const { SEATMAP_REALTIME_ROOM: realtimeNamespace } = getSeatmapRealtimeEnv(event)
  const releasedCount = await holdService.expireStaleHolds(realtimeNamespace)

  const events = await useDB().select().from(tables.events).all()
  for (const event of events) {
    await analyticsService.recomputeDailyBucket(event.id)
  }

  const response: ReleaseHoldsTaskData = {
    result: 'Expired holds released',
    releasedCount,
    eventsRecomputed: events.length,
  }

  return success(response)
})
