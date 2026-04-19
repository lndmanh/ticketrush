import { changePasswordSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { getAuthorizedUserId } from '~~/server/utils/authorization'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)

  const result = await readValidatedBody(event, body => changePasswordSchema.safeParse(body))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. The password change request contains invalid data.',
      data: result.error,
    })
  }

  // Get current user
  const user = await userService.getById(userId)
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found. The requested user account does not exist.',
    })
  }

  // Verify current password
  const isValidPassword = await verifyPassword(user.password, result.data.currentPassword)
  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized. The current password provided is incorrect.',
    })
  }

  // Hash new password
  const hashedPassword = await hashPassword(result.data.newPassword)

  // Update password
  const updatedUser = await userService.update({
    id: userId,
    password: hashedPassword,
  })

  if (!updatedUser) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error. Failed to update the password.',
    })
  }

  return success({ message: 'Password updated successfully' })
})
