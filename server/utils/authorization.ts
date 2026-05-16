import type { H3Event } from 'h3'
import userService from '~~/server/utils/database/user'
import { apiError } from '~~/server/utils/apiResponse'

export function resolveAuthorizedTargetUserId(targetId: string | undefined, sessionUserId: number): number {
  const currentUserId = Number(sessionUserId)

  if (!Number.isSafeInteger(currentUserId) || currentUserId <= 0) {
    throw apiError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Unauthorized. Your session is invalid. Please sign in again.',
      code: 'INVALID_SESSION',
    })
  }

  if (!targetId) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bad Request. User ID parameter is missing.',
      code: 'RESOURCE_ACCESS_DENIED',
    })
  }

  const resolvedTargetId = targetId === 'me' ? currentUserId : Number(targetId)

  if (!Number.isSafeInteger(resolvedTargetId) || resolvedTargetId <= 0) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bad Request. The provided user ID is not a valid number.',
      code: 'RESOURCE_ACCESS_DENIED',
    })
  }

  return resolvedTargetId
}

/**
 * Get the target user ID from route parameter and verify access permissions.
 * - Admins can access any user's data
 * - Regular users can only access their own data (via their ID or "me")
 *
 * @param event - The H3 event object
 * @param paramName - The route parameter name (default: 'id')
 * @returns The resolved user ID that can be accessed
 * @throws API error if the user cannot be authorized for the requested resource
 */
export async function getAuthorizedUserId(event: H3Event, paramName = 'id'): Promise<number> {
  const session = await requireUserSession(event)
  const currentUserId = Number(session.user.id)

  // Get the target user ID from route parameter
  const targetId = getRouterParam(event, paramName)
  const resolvedTargetId = resolveAuthorizedTargetUserId(targetId, currentUserId)

  // Get the current user from database to check admin status
  const currentUser = await userService.getById(currentUserId)
  if (!currentUser) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Authenticated user account not found.',
      code: 'RESOURCE_ACCESS_DENIED',
    })
  }

  // Admins can access any user's data
  if (currentUser.isAdmin) {
    return resolvedTargetId
  }

  // Regular users can only access their own data
  if (resolvedTargetId !== currentUserId) {
    throw apiError({
      status: 403,
      statusText: 'Forbidden',
      message: 'Forbidden. You do not have permission to access this user\'s data.',
      code: 'USER_ID_MISMATCH',
    })
  }

  return resolvedTargetId
}
