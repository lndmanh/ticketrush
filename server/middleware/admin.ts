import userService from '~~/server/utils/database/user'
import { apiError } from '~~/server/utils/apiResponse'
import { apiRoutes } from '#shared/apiRoutes'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (path === apiRoutes.ADMIN_TASKS_SEED_ADMIN) return

  if (path.startsWith(apiRoutes.ADMIN_API_PREFIX)) {
    const session = await requireUserSession(event)
    const user = await userService.getById(session.user.id)
    if (!user) {
      throw apiError({
        status: 404,
        statusText: 'Not Found',
        message: 'User not found.',
        code: 'RESOURCE_ACCESS_DENIED',
      })
    }

    if (!user.isAdmin) {
      throw apiError({
        status: 403,
        statusText: 'Forbidden',
        message: 'Administrator access is required.',
        code: 'ADMIN_REQUIRED',
      })
    }
  }
})
