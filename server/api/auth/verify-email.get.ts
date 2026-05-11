import authTokenService from '~~/server/utils/database/authToken'
import userService from '~~/server/utils/database/user'
import { apiRoutes } from '#shared/apiRoutes'
import { AuthTokenType } from '#shared/commonEnums'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token : ''

  if (!token) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=invalid-token')
  }

  const tokenRecord = await authTokenService.verifyToken(token, AuthTokenType.EmailVerification)

  if (!tokenRecord) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=invalid-token')
  }

  if (tokenRecord.expiresAt < new Date()) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=token-expired')
  }

  const user = await userService.getById(tokenRecord.userId)
  if (!user) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=invalid-token')
  }

  await userService.update({ id: user.id, emailVerified: true })
  await authTokenService.markUsed(tokenRecord.id)
  await authTokenService.invalidateUserTokens(user.id, AuthTokenType.EmailVerification)

  return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?success=email-verified')
})
