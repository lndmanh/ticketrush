import userService from '~~/server/utils/database/user'
import { apiRoutes } from '#shared/apiRoutes'
import { loginSchema } from '#shared/schemas/userSchema'

function wantsJsonResponse(event: H3Event) {
  const accept = getHeader(event, 'accept') ?? ''
  return accept.includes('application/json')
}

function authFailure(event: H3Event, redirectPath: string, message: string) {
  if (wantsJsonResponse(event)) {
    throw createError({ statusCode: 400, statusMessage: message })
  }
  return sendRedirect(event, redirectPath)
}

function authSuccess(event: H3Event, redirectPath: string) {
  if (wantsJsonResponse(event)) {
    return { redirectTo: redirectPath }
  }
  return sendRedirect(event, redirectPath)
}

function safeRedirectPath(value: string | undefined) {
  if (typeof value !== 'string' || value.length === 0) {
    return '/'
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  try {
    const url = new URL(value, 'http://localhost')
    if (url.origin !== 'http://localhost') {
      return '/'
    }
    return `${url.pathname}${url.search}${url.hash}` || '/'
  }
  catch {
    return '/'
  }
}

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => loginSchema.safeParse(body))
  if (!result.success) {
    return authFailure(event, apiRoutes.AUTH_LOGIN + '?error=validation', 'Please check your login details')
  }

  const { username, password, 'cf-turnstile-response': token } = result.data
  const redirectToStr = safeRedirectPath(result.data['redirect-to'])

  if (!token) {
    return authFailure(event, apiRoutes.AUTH_LOGIN + '?error=captcha', 'Please complete the verification challenge')
  }

  const tokenValidation = await verifyTurnstileToken(token)
  if (!tokenValidation.success) {
    return authFailure(event, apiRoutes.AUTH_LOGIN + '?error=captcha', 'Verification failed. Please try again')
  }

  // Find user by username
  const user = await userService.getByUsername(username)
  if (!user) {
    return authFailure(event, apiRoutes.AUTH_LOGIN + '?error=invalid-credentials', 'Invalid username or password')
  }

  // Verify password using nuxt-auth-utils
  const isValidPassword = await verifyPassword(user.password, password)

  if (!isValidPassword) {
    return authFailure(event, apiRoutes.AUTH_LOGIN + '?error=invalid-credentials', 'Invalid username or password')
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

  return authSuccess(event, redirectToStr)
})
