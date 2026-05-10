import { z } from 'zod'
import { apiError, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import userService from '~~/server/utils/database/user'
import authTokenService from '~~/server/utils/database/authToken'
import { sendPasswordResetEmail } from '~~/server/utils/email'

const bodySchema = z.object({
  'email': z.email(),
  'cf-turnstile-response': z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => bodySchema.safeParse(body))
  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Valid email and security verification are required.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(result.error),
    })
  }

  const tokenValidation = await verifyTurnstileToken(result.data['cf-turnstile-response'])
  if (!tokenValidation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Security verification failed. Please try again.',
      code: 'CAPTCHA_VERIFICATION_FAILED',
    })
  }

  const user = await userService.getByEmail(result.data.email)

  // Always return success to prevent email enumeration
  if (!user) {
    return success({})
  }

  const hasRecent = await authTokenService.hasRecentToken(user.id, 'password_reset')
  if (hasRecent) {
    // Still return success to prevent timing attacks
    return success({})
  }

  await authTokenService.invalidateUserTokens(user.id, 'password_reset')
  const token = await authTokenService.createToken(user.id, 'password_reset')
  await sendPasswordResetEmail(user.email, user.username, token)

  return success({})
})
