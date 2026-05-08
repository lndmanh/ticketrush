import { z } from 'zod'
import { passwordComplexitySchema } from '#shared/schemas/userSchema'
import authTokenService from '~~/server/utils/database/authToken'
import userService from '~~/server/utils/database/user'
import { apiError, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'

const bodySchema = z.object({
  token: z.string().min(1),
  password: passwordComplexitySchema,
  confirmPassword: z.string().min(1),
}).refine(data => data.password === data.confirmPassword, {
  error: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => bodySchema.safeParse(body))
  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please check your input and try again.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(result.error),
    })
  }

  const tokenRecord = await authTokenService.verifyToken(result.data.token, 'password_reset')
  if (!tokenRecord) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'The reset link is invalid or has expired.',
      code: 'RESET_TOKEN_INVALID',
    })
  }

  const user = await userService.getById(tokenRecord.userId)
  if (!user) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'User not found.',
      code: 'USER_NOT_FOUND',
    })
  }

  const hashedPassword = await hashPassword(result.data.password)

  await userService.update({ id: user.id, password: hashedPassword })
  await authTokenService.markUsed(tokenRecord.id)
  await authTokenService.invalidateUserTokens(user.id, 'password_reset')

  // Also verify email if it wasn't verified (user proved email ownership via reset link)
  if (!user.emailVerified) {
    await userService.update({ id: user.id, emailVerified: true })
    await authTokenService.invalidateUserTokens(user.id, 'email_verification')
  }

  return success({})
})
