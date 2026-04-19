import type { H3Event } from 'h3'
import userService from '~~/server/utils/database/user'

/**
 * Get the target user ID from route parameter and verify access permissions.
 * - Admins can access any user's data
 * - Regular users can only access their own data (via their ID or "me")
 *
 * @param event - The H3 event object
 * @param paramName - The route parameter name (default: 'id')
 * @returns The resolved user ID that can be accessed
 * @throws 403 error if user doesn't have permission to access the requested user
 */
export async function getAuthorizedUserId(event: H3Event, paramName = 'id'): Promise<number> {
  const session = await requireUserSession(event)
  const currentUserId = session.user.id

  // Get the current user from database to check admin status
  const currentUser = await userService.getById(currentUserId)
  if (!currentUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Authenticated user account not found.',
    })
  }

  // Get the target user ID from route parameter
  const targetId = getRouterParam(event, paramName)
  if (!targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. User ID parameter is missing.',
    })
  }

  // Resolve "me" to the current user's ID
  const resolvedTargetId = targetId === 'me' ? currentUserId : Number(targetId)

  // Validate that the resolved ID is a valid number
  if (isNaN(resolvedTargetId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request. The provided user ID is not a valid number.',
    })
  }

  // Admins can access any user's data
  if (currentUser.isAdmin) {
    return resolvedTargetId
  }

  // Regular users can only access their own data
  if (resolvedTargetId !== currentUserId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden. You do not have permission to access this user\'s data.',
    })
  }

  return resolvedTargetId
}
