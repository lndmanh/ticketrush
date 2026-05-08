import userSchema from '~~/server/utils/database/user'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { AdminBulkUserDeletePayload } from '~~/types/admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userIds } = body

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_USER_IDS', message: 'A non-empty array of user IDs is required.' })
  }
  await userSchema.bulkDelete(userIds)

  const response: AdminBulkUserDeletePayload = {
    deleted: userIds.length,
  }

  return success(response)
})
