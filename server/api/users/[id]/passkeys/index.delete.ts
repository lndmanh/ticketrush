import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { apiError, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import userService from '~~/server/utils/database/user'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const sessionUser = session.user
  const db = useDB()

  // Parse and validate request body
  const body = await readBody(event)
  const result = z.object({
    credentialId: z.string(),
  }).safeParse(body)

  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please fix the highlighted fields.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(result.error),
    })
  }

  const { credentialId } = result.data

  // Check if the credential belongs to the current user
  const credential = await db
    .select()
    .from(tables.credentials)
    .where(
      and(
        eq(tables.credentials.id, credentialId),
        eq(tables.credentials.userId, sessionUser.id),
      ),
    )
    .get()

  if (!credential) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Not Found. The specified passkey was not found or does not belong to this account.',
      code: 'PASSKEY_NOT_FOUND',
    })
  }

  // Check if this is the user's last passkey and they don't have a password
  const userCredentialsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.credentials)
    .where(eq(tables.credentials.userId, sessionUser.id))
    .get()

  const user = await userService.getById(sessionUser.id)

  // If this is the last passkey and user has no password, prevent deletion
  if (userCredentialsCount?.count === 1 && !user?.password) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Bad Request. Cannot delete your last passkey without setting up password authentication first.',
      code: 'LAST_PASSKEY_REQUIRES_PASSWORD',
    })
  }

  await db
    .delete(tables.credentials)
    .where(
      and(
        eq(tables.credentials.id, credentialId),
        eq(tables.credentials.userId, sessionUser.id),
      ),
    )

  return {
    success: true,
    message: 'Passkey deleted successfully',
  }
})
