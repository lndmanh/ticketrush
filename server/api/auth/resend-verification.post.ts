import { z } from 'zod'
import { apiError, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import userService from '~~/server/utils/database/user'
import authTokenService from '~~/server/utils/database/authToken'
import { sendVerificationEmail } from '~~/server/utils/email'

const bodySchema = z.object({
  email: z.email(),
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => bodySchema.safeParse(body))
  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Valid email is required.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(result.error),
    })
  }

  const user = await userService.getByEmail(result.data.email)

  // Always return success to prevent email enumeration
  if (!user || user.emailVerified) {
    return success({})
  }

  const hasRecent = await authTokenService.hasRecentToken(user.id, 'email_verification')
  if (hasRecent) {
    throw apiError({
      status: 429,
      statusText: 'Too Many Requests',
      message: 'A verification email was recently sent. Please wait a moment before requesting another.',
      code: 'VERIFICATION_EMAIL_RATE_LIMITED',
    })
  }

  await authTokenService.invalidateUserTokens(user.id, 'email_verification')
  const token = await authTokenService.createToken(user.id, 'email_verification')
  await sendVerificationEmail(user.email, user.username, token)

  return success({})
})
