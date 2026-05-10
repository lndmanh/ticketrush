import userService from '~~/server/utils/database/user'
import { apiRoutes } from '#shared/apiRoutes'
import { loginSchema } from '#shared/schemas/userSchema'

function safeRedirectPath(value: string | undefined, origin: string): string {
  if (!value) {
    return '/'
  }

  try {
    const parsed = new URL(value, origin)
    if (parsed.origin !== origin) {
      return '/'
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return '/'
  }
}

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => loginSchema.safeParse(body))
  console.log(result)
  if (!result.success) {
    return sendRedirect(event, apiRoutes.AUTH_LOGIN + '?error=validation')
  }

  const { username, password, 'cf-turnstile-response': token } = result.data
  const redirectToStr = safeRedirectPath(result.data['redirect-to'], getRequestURL(event).origin)

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

  // Check email verification
  if (!user.emailVerified) {
    return sendRedirect(event, apiRoutes.AUTH_VERIFY_EMAIL + '?email=' + encodeURIComponent(user.email) + '&redirectTo=' + encodeURIComponent(redirectToStr))
  }

  // Update last login
  await userService.update({ id: user.id, lastLoginAt: new Date() })
  // Normal login (2FA off)
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
