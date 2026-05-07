import type { User } from '#shared/db'
import userService from '~~/server/utils/database/user'

export default defineEventHandler(async () => {
  const response: User[] = await userService.getList()
  return success(response)
})
