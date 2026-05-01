import queueService from '~~/server/utils/ticketing/queue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const sessions = await useDB().select().from(tables.eventSessions).all()
  const admissionSummary: Array<{ eventSessionId: number, admittedCount: number }> = []

  for (const session of sessions) {
    const admitted = await queueService.admitNextBatch(session.id)
    admissionSummary.push({
      eventSessionId: session.id,
      admittedCount: admitted.length,
    })
  }

  const expiredCount = await queueService.expireAdmittedEntries()

  return success({
    result: 'Queue admission processed',
    expiredCount,
    admissionSummary,
  })
})
