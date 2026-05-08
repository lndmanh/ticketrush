import { changePasswordSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { getAuthorizedUserId } from '~~/server/utils/authorization'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { MessagePayload } from '~~/types/common'

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)

  const result = await readValidatedBody(event, body => changePasswordSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  // Get current user
  const user = await userService.getById(userId)
  if (!user) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'USER_NOT_FOUND', message: 'The requested user account does not exist.' })
  }

  // Verify current password
  const isValidPassword = await verifyPassword(user.password, result.data.currentPassword)
  if (!isValidPassword) {
    throw apiError({ status: 401, statusText: 'Unauthorized', code: 'CURRENT_PASSWORD_INCORRECT', message: 'The current password provided is incorrect.' })
  }

  // Hash new password
  const hashedPassword = await hashPassword(result.data.newPassword)

  // Update password
  const updatedUser = await userService.update({
    id: userId,
    password: hashedPassword,
  })

  if (!updatedUser) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'PASSWORD_UPDATE_FAILED', message: 'Failed to update the password.' })
  }

  const response: MessagePayload = { message: 'Password updated successfully' }
  return success(response)
})
