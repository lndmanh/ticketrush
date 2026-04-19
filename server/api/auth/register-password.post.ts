import { registerUserSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { apiRoutes } from '#shared/apiRoutes'
import type { User } from '#shared/db'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => registerUserSchema.safeParse(body))
  if (!result.success) {
    return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=validation')
  }

  const { username, password, 'cf-turnstile-response': token } = result.data

  const tokenValidation = await verifyTurnstileToken(token)
  if (!tokenValidation.success) {
    return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=captcha')
  }

  // 1. CHEAP PRE-CHECK: Prevent CPU Exhaustion (DoS) by checking constraints before hashing
  const [existingUsername, existingEmail] = await Promise.all([
    userService.getByUsername(username),
    userService.getByEmail(result.data.email),
  ])

  if (existingUsername) {
    return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=existed')
  }
  if (existingEmail) {
    return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=email-existed')
  }

  // 2. EXPENSIVE OPERATION: Hash only when pre-checks pass
  const hashedPassword = await hashPassword(password)

  // 3. ATOMIC INSERT: Protect against Time-Of-Check to Time-Of-Use (TOCTOU) race conditions
  let newUser: User
  try {
    newUser = await userService.create({
      ...result.data,
      password: hashedPassword,
      isAdmin: false,
    })
  }
  catch (err: unknown) {
    const maybeErr = err as { code?: string, message?: string, cause?: { message?: string } }
    // Fallback for strict concurrency races relying on standard SQLite constraint codes
    const isUniqueConstraint = maybeErr.code === 'SQLITE_CONSTRAINT' || maybeErr.code === 'SQLITE_CONSTRAINT_UNIQUE' || maybeErr.message?.includes('UNIQUE')
    if (isUniqueConstraint) {
      if (maybeErr.message?.includes('email') || maybeErr.cause?.message?.includes('email')) {
        return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=email-existed')
      }
      return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=existed')
    }
    throw err
  }

  // we only set necessary properties from user object
  await setUserSession(event, {
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
    },
  })

  if (result.data['redirect-to']) {
    return sendRedirect(event, result.data['redirect-to'])
  }
  else {
    return sendRedirect(event, '/')
  }
})
