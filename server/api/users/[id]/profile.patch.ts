import { z } from 'zod'
import { emailSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { getAuthorizedUserId } from '~~/server/utils/authorization'
import { success } from '~~/server/utils/apiResponse'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: emailSchema,
})

export default defineEventHandler(async (event) => {
  const userId = await getAuthorizedUserId(event)

  const result = await readValidatedBody(event, body => updateProfileSchema.safeParse(body))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. The submitted profile data is invalid.',
      data: result.error,
    })
  }

  // Check if email is already taken by another user
  const existingUser = await userService.getByEmail(result.data.email)
  if (existingUser && existingUser.id !== userId) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict. This email address is already associated with another account.',
    })
  }

  const updatedUser = await userService.update({
    id: userId,
    name: result.data.name,
    email: result.data.email,
  })

  if (!updatedUser) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error. Failed to update the user profile.',
    })
  }

  return success({
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    email: updatedUser.email,
  })
})
