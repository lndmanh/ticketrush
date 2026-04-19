import userService from '~~/server/utils/database/user'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. The provided user ID is not a valid number.',
    })
  }

  await userService.delete(id)
  return { success: true }
})
