import { getAuthorizedUserId } from '~~/server/utils/authorization'
import { success } from '~~/server/utils/apiResponse'
import { getUserProfileById } from '~~/server/utils/userProfile'

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)
  const response = await getUserProfileById(userId)

  return success(response)
})
