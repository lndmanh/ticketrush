import userService from '~~/server/utils/database/user'
import { success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  await userService.delete(session.user.id)

  return success({})
})
