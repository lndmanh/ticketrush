import { createUserSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import type { AdminUserModel } from '~~/types/models/profile'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createUserSchema.safeParse(body))
  if (!result.success) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'VALIDATION_ERROR', message: 'Invalid request.', fieldErrors: zodErrorToFieldErrors(result.error), cause: result.error })
  }

  const { password } = result.data
  const hashedPassword = await hashPassword(password)

  const newUser = await userService.create({
    ...result.data,
    password: hashedPassword,
    emailVerified: true, // Admin-created users are pre-verified
  })

  const response: AdminUserModel = {
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    email: newUser.email,
    isAdmin: newUser.isAdmin,
  }

  return success(response)
})
