import { getAuthorizedUserId } from '~~/server/utils/authorization'
import userService from '~~/server/utils/database/user'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { UserProfileModel } from '~~/types/models/profile'

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)
  const dbUser = await userService.getById(userId)

  if (!dbUser) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'USER_NOT_FOUND', message: 'User not found.' })
  }

  const userProfile: UserProfileModel = {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    email: dbUser.email,
    createdAt: dbUser.createdAt || new Date(),
    lastLoginAt: dbUser.lastLoginAt || dbUser.createdAt || new Date(),
    hasPassword: !!dbUser.password && dbUser.password.trim().length > 0,
    isAdmin: dbUser.isAdmin,
  }

  const response: UserProfileModel = userProfile
  return success(response)
})
