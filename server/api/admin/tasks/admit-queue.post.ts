import type { AdmitQueueTaskData, AdminTaskAdmissionSummary } from '~~/types/admin-tasks'
import queueService from '~~/server/utils/ticketing/queue'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const sessions = await useDB().select().from(tables.eventSessions).all()
  const admissionSummary: AdminTaskAdmissionSummary[] = []

  for (const session of sessions) {
    const admitted = await queueService.admitNextBatch(session.id)
    admissionSummary.push({
      eventSessionId: session.id,
      admittedCount: admitted.length,
    })
  }

  const expiredCount = await queueService.expireAdmittedEntries()

  const response: AdmitQueueTaskData = {
    result: 'Queue admission processed',
    expiredCount,
    admissionSummary,
  }

  return success(response)
})
