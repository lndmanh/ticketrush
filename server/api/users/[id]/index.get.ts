import { eq } from 'drizzle-orm'
import { getAuthorizedUserId } from '~~/server/utils/authorization'
import userService from '~~/server/utils/database/user'
import oauthAccountService from '~~/server/utils/database/oauthAccount'
import { apiError, success } from '~~/server/utils/apiResponse'
import type { UserProfileModel } from '~~/types/models/profile'

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)
  const dbUser = await userService.getById(userId)

  if (!dbUser) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Not Found. The requested user account does not exist.',
      code: 'USER_NOT_FOUND',
    })
  }

  // Get passkey count
  const db = useDB()
  const credentials = await db
    .select()
    .from(tables.credentials)
    .where(eq(tables.credentials.userId, userId))
    .all()

  // Get linked OAuth accounts
  const oauthAccounts = await oauthAccountService.getByUserId(userId)

  const userProfile: UserProfileModel = {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    phone: dbUser.phone,
    birthDate: dbUser.birthDate || null,
    gender: dbUser.gender || null,
    email: dbUser.email,
    createdAt: dbUser.createdAt || new Date(),
    lastLoginAt: dbUser.lastLoginAt || dbUser.createdAt || new Date(),
    hasPassword: !!dbUser.password && dbUser.password.trim().length > 0,
    passkeyCount: credentials.length,
    isAdmin: dbUser.isAdmin,
    linkedAccounts: oauthAccounts.map(account => ({
      provider: account.provider,
      email: account.email,
      name: account.name,
      avatarUrl: account.avatarUrl,
      linkedAt: account.createdAt || new Date(),
    })),
  }

  const response: UserProfileModel = userProfile
  return success(response)
})
