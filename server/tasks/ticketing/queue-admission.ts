import queueService from '~~/server/utils/ticketing/queue'

export default defineTask({
  meta: {
    name: 'ticketing:admit-queue',
    description: 'Admit the next queue batch for queue-enabled event sessions',
  },
  async run() {
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

    return {
      result: 'Queue admission processed',
      expiredCount,
      admissionSummary,
    }
  },
})
