import { userUpdateSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { AdminUserModel } from '~~/types/models/profile'

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

  const { password, ...validatedData } = result.data
  const updateData = {
    ...validatedData,
    id: userId,
    ...(password?.trim() ? { password: await hashPassword(password) } : {}),
  }

  const updatedUser = await userService.update(updateData)
  if (!updatedUser) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Not Found. The requested user does not exist.',
      code: 'USER_NOT_FOUND',
    })
  }

  const user: AdminUserModel = {
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    email: updatedUser.email,
    isAdmin: updatedUser.isAdmin,
    isLocked: updatedUser.isLocked,
  }

  return success({ user })
})
