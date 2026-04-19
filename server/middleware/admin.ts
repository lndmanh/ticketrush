import userService from '~~/server/utils/database/user'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/admin')) return

  const session = await requireUserSession(event)
  const user = await userService.getById(session.user.id)
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
    })
  }

  if (!user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden. Administrator privileges are required to access this resource.',
    })
  }
})
