import { z } from 'zod'
import oauthAccountService from '~~/server/utils/database/oauthAccount'
import userService from '~~/server/utils/database/user'

const unlinkBodySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { provider } = await readValidatedBody(event, body => unlinkBodySchema.parse(body))

  const userId = session.user.id

  // Verify this provider is actually linked
  const linkedAccount = await oauthAccountService.getByUserAndProvider(userId, provider)
  if (!linkedAccount) {
    throw createError({
      statusCode: 404,
      statusMessage: 'This provider is not linked to your account.',
    })
  }

  // Check if user has a password
  const dbUser = await userService.getById(userId)
  if (!dbUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
    })
  }

  const hasPassword = !!dbUser.password && dbUser.password.trim().length > 0

  // Count other linked providers
  const linkedCount = await oauthAccountService.countByUserId(userId)

  // User must have at least one other auth method (password or another provider)
  if (!hasPassword && linkedCount <= 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You can\'t unlink your only sign-in method. Set a password first.',
    })
  }

  // Unlink the provider
  await oauthAccountService.unlink(userId, provider)

  return { success: true }
})
