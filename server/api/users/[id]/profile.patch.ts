import { updateProfileSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { getAuthorizedUserId } from '~~/server/utils/authorization'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { ProfileUpdateData } from '~~/types/models/profile'

function parseBirthDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)

  const result = await readValidatedBody(event, body => updateProfileSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  // Check if email is already taken by another user
  const existingUser = await userService.getByEmail(result.data.email)
  if (existingUser && existingUser.id !== userId) {
    throw apiError({ status: 409, statusText: 'Conflict', code: 'EMAIL_ALREADY_IN_USE', message: 'This email address is already associated with another account.' })
  }

  const updatedUser = await userService.update({
    id: userId,
    name: result.data.name,
    email: result.data.email,
    phone: result.data.phone,
    birthDate: parseBirthDate(result.data.birthDate),
    gender: result.data.gender,
  })

  if (!updatedUser) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'PROFILE_UPDATE_FAILED', message: 'Failed to update the user profile.' })
  }

  const response: ProfileUpdateData = {
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    birthDate: updatedUser.birthDate,
    gender: updatedUser.gender,
  }

  return success(response)
})
