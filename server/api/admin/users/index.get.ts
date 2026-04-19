import userService from '~~/server/utils/database/user'

export default defineEventHandler(async () => {
  const userList = await userService.getList()
  return success(userList)
})
