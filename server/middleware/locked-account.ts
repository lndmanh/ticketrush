import userService from '~~/server/utils/database/user'
import { apiError } from '~~/server/utils/apiResponse'
import { apiRoutes } from '#shared/apiRoutes'

/**
 * Middleware that blocks any authenticated API call from locked user accounts.
 *
 * Runs after the admin middleware. It only activates when a valid user session
 * exists, so unauthenticated requests pass through untouched (they are handled
 * by individual route guards).
 *
 * Lock status is always read from the database so it takes effect immediately
 * after an admin changes the account state — no session refresh required.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith(apiRoutes.API_PREFIX)) return

  // Allow the lock-status endpoint through so the client banner can render
  // even when the account is locked.
  if (path === apiRoutes.AUTH_ACCOUNT_STATUS) return

  // Only inspect authenticated sessions — anonymous API calls are ignored.
  const session = await getUserSession(event)
  if (!session.user?.id) return

  const user = await userService.getById(session.user.id)
  if (!user) return

  if (user.isLocked) {
    throw apiError({
      status: 403,
      statusText: 'Forbidden',
      message: 'Your account has been locked. Please contact support.',
      code: 'ACCOUNT_LOCKED',
    })
  }
})
