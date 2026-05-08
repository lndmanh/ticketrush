import { z } from 'zod'
import { emailSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { getAuthorizedUserId } from '~~/server/utils/authorization'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { UserProfileModel } from '~~/types/models/profile'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: emailSchema,
})

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
  })

  if (!updatedUser) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'PROFILE_UPDATE_FAILED', message: 'Failed to update the user profile.' })
  }

  const response: Pick<UserProfileModel, 'id' | 'username' | 'name' | 'email'> = {
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    email: updatedUser.email,
  }

  return success(response)
})
