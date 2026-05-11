import { registerUserSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import authTokenService from '~~/server/utils/database/authToken'
import { sendVerificationEmail } from '~~/server/utils/email'
import { apiRoutes } from '#shared/apiRoutes'
import type { User } from '#shared/db'
import type { RegisterUserInput } from '#shared/schemas/userSchema'
import { AuthTokenType } from '#shared/commonEnums'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

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
  const result = await readValidatedBody(event, body => registerUserSchema.safeParse(body))
  if (!result.success) {
    return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=validation')
  }

  const { username, password, 'cf-turnstile-response': token } = result.data

  const tokenValidation = await verifyTurnstileToken(token)
  if (!tokenValidation.success) {
    return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=captcha')
  }

  const redirectTo = safeRedirectPath(result.data['redirect-to'], getRequestURL(event).origin)

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
    const createPayload: Pick<RegisterUserInput, 'username' | 'email' | 'name'> & {
      password: string
      emailVerified: boolean
      isAdmin: boolean
    } = {
      username: result.data.username,
      email: result.data.email,
      name: result.data.name,
      password: hashedPassword,
      emailVerified: false,
      isAdmin: false,
    }

    newUser = await userService.create({
      ...createPayload,
    })
  }
  catch (err: unknown) {
    let maybeErrCode: string | undefined
    let maybeErrMessage: string | undefined
    let maybeErrCauseMessage: string | undefined

    if (isRecord(err)) {
      const errorRecord = err
      if (typeof errorRecord.code === 'string') {
        maybeErrCode = errorRecord.code
      }
      if (typeof errorRecord.message === 'string') {
        maybeErrMessage = errorRecord.message
      }
      if (isRecord(errorRecord.cause)) {
        const causeRecord = errorRecord.cause
        if (typeof causeRecord.message === 'string') {
          maybeErrCauseMessage = causeRecord.message
        }
      }
    }
    // Fallback for strict concurrency races relying on standard SQLite constraint codes
    const isUniqueConstraint = maybeErrCode === 'SQLITE_CONSTRAINT' || maybeErrCode === 'SQLITE_CONSTRAINT_UNIQUE' || maybeErrMessage?.includes('UNIQUE')
    if (isUniqueConstraint) {
      if (maybeErrMessage?.includes('email') || maybeErrCauseMessage?.includes('email')) {
        return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=email-existed')
      }
      return sendRedirect(event, apiRoutes.AUTH_REGISTER + '?error=existed')
    }
    throw err
  }

  // Send verification email (non-blocking - don't fail registration if email fails)
  const verificationToken = await authTokenService.createToken(newUser.id, AuthTokenType.EmailVerification)
  sendVerificationEmail(newUser.email, newUser.username, verificationToken).catch((err) => {
    console.error('[Register] Failed to send verification email:', err)
  })

  return sendRedirect(event, apiRoutes.AUTH_VERIFY_EMAIL + '?email=' + encodeURIComponent(newUser.email) + '&redirectTo=' + encodeURIComponent(redirectTo))
})
