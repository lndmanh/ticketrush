import { apiError, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { userUpdateSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(userId)) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bad Request. The provided user ID is not a valid number.',
      code: 'INVALID_USER_ID',
    })
  }
  const result = await readValidatedBody(event, body => userUpdateSchema.safeParse(body))
  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bad Request. The submitted user data is invalid.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(result.error),
    })
  }

  // Hash password if provided
  if (result.data.password && typeof result.data.password === 'string' && result.data.password.trim()) {
    result.data.password = await hashPassword(result.data.password)
  }

  return success({ user })
})
