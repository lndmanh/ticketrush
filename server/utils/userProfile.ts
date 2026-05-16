import { eq } from 'drizzle-orm'
import { apiError } from '~~/server/utils/apiResponse'
import oauthAccountService from '~~/server/utils/database/oauthAccount'
import userService from '~~/server/utils/database/user'
import type { UserProfileModel } from '~~/types/models/profile'

export async function getUserProfileById(userId: number): Promise<UserProfileModel> {
  const dbUser = await userService.getById(userId)

  if (!dbUser) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Not Found. The requested user account does not exist.',
      code: 'USER_NOT_FOUND',
    })
  }

  const db = useDB()
  const credentials = await db
    .select()
    .from(tables.credentials)
    .where(eq(tables.credentials.userId, userId))
    .all()

  const oauthAccounts = await oauthAccountService.getByUserId(userId)

  return {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
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
}
