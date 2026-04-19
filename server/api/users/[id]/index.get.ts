import { getAuthorizedUserId } from '~~/server/utils/authorization'
import userService from '~~/server/utils/database/user'
import { success } from '~~/server/utils/apiResponse'
import type { UserProfileModel } from '~~/types/models/profile'

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)
  const dbUser = await userService.getById(userId)

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    })
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

  return success(userProfile)
})
