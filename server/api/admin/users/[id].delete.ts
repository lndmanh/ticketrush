import userService from '~~/server/utils/database/user'
import { apiError } from '~~/server/utils/apiResponse'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bad Request. The provided user ID is not a valid number.',
      code: 'INVALID_USER_ID',
    })
  }

  await userService.delete(id)
  return success({})
})
