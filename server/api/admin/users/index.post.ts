import { createUserSchema } from '#shared/schemas/userSchema'
import userService from '~~/server/utils/database/user'

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createUserSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request. The submitted user data is invalid.', data: result.error })
  }

  const { password } = result.data
  const hashedPassword = await hashPassword(password)

  const newUser = await userService.create({
    ...result.data,
    password: hashedPassword,
  })

  return success({
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    email: newUser.email,
    isAdmin: newUser.isAdmin,
  })
})
