import { registerUserSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { apiRoutes } from '#shared/apiRoutes'
import type { User } from '#shared/db'

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
  const result = await readValidatedBody(event, body => registerUserSchema.safeParse(body))
  if (!result.success) {
    return authFailure(event, apiRoutes.AUTH_REGISTER + '?error=validation', 'Please check your registration details')
  }

  const { username, password, 'cf-turnstile-response': token } = result.data

  const tokenValidation = await verifyTurnstileToken(token)
  if (!tokenValidation.success) {
    return authFailure(event, apiRoutes.AUTH_REGISTER + '?error=captcha', 'Verification failed. Please try again')
  }

  // 1. CHEAP PRE-CHECK: Prevent CPU Exhaustion (DoS) by checking constraints before hashing
  const [existingUsername, existingEmail] = await Promise.all([
    userService.getByUsername(username),
    userService.getByEmail(result.data.email),
  ])

  if (existingUsername) {
    return authFailure(event, apiRoutes.AUTH_REGISTER + '?error=existed', 'Username is already taken')
  }
  if (existingEmail) {
    return authFailure(event, apiRoutes.AUTH_REGISTER + '?error=email-existed', 'Email is already registered')
  }

  // 2. EXPENSIVE OPERATION: Hash only when pre-checks pass
  const hashedPassword = await hashPassword(password)

  // 3. ATOMIC INSERT: Protect against Time-Of-Check to Time-Of-Use (TOCTOU) race conditions
  let newUser: User
  try {
    newUser = await userService.create({
      username,
      email: result.data.email,
      name: result.data.name,
      password: hashedPassword,
      isAdmin: false,
    })
  }
  catch (err: unknown) {
    if (typeof err === 'object' && err !== null) {
      const codeValue = Reflect.get(err, 'code')
      const messageValue = Reflect.get(err, 'message')
      let causeMessage = ''
      const causeValue = Reflect.get(err, 'cause')
      if (typeof causeValue === 'object' && causeValue !== null) {
        const nestedMessage = Reflect.get(causeValue, 'message')
        if (typeof nestedMessage === 'string') {
          causeMessage = nestedMessage
        }
      }
      const code = typeof codeValue === 'string' ? codeValue : ''
      const message = typeof messageValue === 'string' ? messageValue : ''
      const isUniqueConstraint = code === 'SQLITE_CONSTRAINT' || code === 'SQLITE_CONSTRAINT_UNIQUE' || message.includes('UNIQUE')
      if (isUniqueConstraint) {
        if (message.includes('email') || causeMessage.includes('email')) {
          return authFailure(event, apiRoutes.AUTH_REGISTER + '?error=email-existed', 'Email is already registered')
        }
        return authFailure(event, apiRoutes.AUTH_REGISTER + '?error=existed', 'Username is already taken')
      }
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

  return authSuccess(event, safeRedirectPath(result.data['redirect-to']))
})
