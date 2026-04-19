import userService from '~~/server/utils/database/user'
import { apiRoutes } from '#shared/apiRoutes'
import { loginSchema } from '#shared/schemas/userSchema'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => loginSchema.safeParse(body))
  if (!result.success) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=validation')
  }

  const { username, password, 'cf-turnstile-response': token } = result.data
  const redirectToStr = result.data['redirect-to'] || '/'

  if (!token) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=captcha')
  }

  const tokenValidation = await verifyTurnstileToken(token)
  if (!tokenValidation.success) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=captcha')
  }

  // Find user by username
  const user = await userService.getByUsername(username)
  if (!user) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=invalid-credentials')
  }

  // Verify password using nuxt-auth-utils
  const isValidPassword = await verifyPassword(user.password, password)

  if (!isValidPassword) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=invalid-credentials')
  }

  // Update last login
  await userService.update({ id: user.id, lastLoginAt: new Date() })
  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
    },
  })

  return sendRedirect(event, redirectToStr)
})
