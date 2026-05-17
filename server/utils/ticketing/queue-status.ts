import type { QueueState } from '~~/types/ticketing'
import { and, eq } from 'drizzle-orm'
import queueService from '~~/server/utils/ticketing/queue'

const QUEUE_REFRESH_LOCK_PREFIX = 'queue-refresh-lock'
const QUEUE_REFRESH_LOCK_STALE_TTL_MS = 60_000

function getQueueRefreshLockKey(eventSessionId: number) {
  return `${QUEUE_REFRESH_LOCK_PREFIX}:${eventSessionId}`
}

function getQueueRefreshLockValue() {
  return crypto.randomUUID()
}

async function acquireQueueRefreshLock(eventSessionId: number): Promise<string | null> {
  const db = useDB()
  const key = getQueueRefreshLockKey(eventSessionId)
  const now = new Date()
  const owner = getQueueRefreshLockValue()

  try {
    await db.insert(tables.systemSettings).values({
      key,
      value: owner,
      createdAt: now,
      updatedAt: now,
    })

    return owner
  }
  catch {
    const existing = await db
      .select()
      .from(tables.systemSettings)
      .where(eq(tables.systemSettings.key, key))
      .get()

    if (!existing) {
      return null
    }

    if (now.getTime() - existing.updatedAt.getTime() <= QUEUE_REFRESH_LOCK_STALE_TTL_MS) {
      return null
    }

    await db
      .delete(tables.systemSettings)
      .where(and(
        eq(tables.systemSettings.key, key),
        eq(tables.systemSettings.value, existing.value),
      ))

    try {
      const retryOwner = getQueueRefreshLockValue()
      await db.insert(tables.systemSettings).values({
        key,
        value: retryOwner,
        createdAt: now,
        updatedAt: now,
      })

      return retryOwner
    }
    catch {
      return null
    }
  }
}

async function releaseQueueRefreshLock(eventSessionId: number, owner: string) {
  const db = useDB()
  await db
    .delete(tables.systemSettings)
    .where(and(
      eq(tables.systemSettings.key, getQueueRefreshLockKey(eventSessionId)),
      eq(tables.systemSettings.value, owner),
    ))
}

export async function refreshQueueStatusForSession(eventSessionId: number, customerKey: string): Promise<QueueState | null> {
  const owner = await acquireQueueRefreshLock(eventSessionId)
  if (!owner) {
    return queueService.getStatus(eventSessionId, customerKey)
  }

  try {
    // Coordinate refresh/admission across workers and instances.
    await queueService.expireAdmittedEntries(eventSessionId)

    const currentStatus = await queueService.getStatus(eventSessionId, customerKey, { skipExpire: true })
    if (currentStatus && currentStatus.waitingCount > 0 && currentStatus.admittedCount === 0) {
      await queueService.admitNextBatch(eventSessionId)
      return queueService.getStatus(eventSessionId, customerKey, { skipExpire: true })
    }

    return currentStatus
  }
  finally {
    try {
      await releaseQueueRefreshLock(eventSessionId, owner)
    }
    catch {
      // Best-effort release of the cross-worker admission lock.
    }
  }
}
