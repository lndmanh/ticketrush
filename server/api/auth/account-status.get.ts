import userService from '~~/server/utils/database/user'
import { success } from '~~/server/utils/apiResponse'

/**
 * Lightweight endpoint that returns the current user's lock status.
 * This route is explicitly exempt from the locked-account middleware so that
 * locked users can still check their own status (used by the client-side banner).
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user?.id) {
    return success({ isLocked: false })
  }

  const user = await userService.getById(session.user.id)
  return success({ isLocked: user?.isLocked ?? false })
})
