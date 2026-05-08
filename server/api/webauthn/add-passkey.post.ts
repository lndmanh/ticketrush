import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useKV } from '~~/server/utils/kv'
import { apiError } from '~~/server/utils/apiResponse'

export default defineWebAuthnRegisterEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    await useKV().set(`auth:challenge:${attemptId}`, challenge, { ttl: 60 })
  },
  async getChallenge(event, attemptId) {
    const challenge = await useKV().get<string>(`auth:challenge:${attemptId}`)
    if (!challenge) {
      throw apiError({ status: 400, statusText: 'Bad Request', code: 'WEBAUTHN_CHALLENGE_EXPIRED', message: 'The authentication challenge has expired or was not found. Please try again.' })
    }
    await useKV().del(`auth:challenge:${attemptId}`)
    return challenge
  },
  validateUser: user => z.object({
    userName: z.string().min(1).toLowerCase().trim(),
    displayName: z.string().min(1).trim().optional(),
  }).parseAsync(user),
  async onSuccess(event, { user, credential }) {
    const db = useDB()
    const session = await getUserSession(event)

    if (!session?.user) {
      throw apiError({ status: 401, statusText: 'Unauthorized', code: 'AUTH_REQUIRED', message: 'You must be signed in to add a passkey.' })
    }

    // Verify the username matches the logged-in user
    const sessionUser = session.user
    if (sessionUser.username !== user.userName) {
      throw apiError({ status: 403, statusText: 'Forbidden', code: 'WEBAUTHN_REGISTRATION_FAILED', message: 'The username does not match the currently authenticated user.' })
    }

    // Check if user already has a credential with this ID
    const existingCredential = await db
      .select()
      .from(tables.credentials)
      .where(eq(tables.credentials.id, credential.id))
      .get()

    if (existingCredential) {
      throw apiError({ status: 400, statusText: 'Bad Request', code: 'WEBAUTHN_CREDENTIAL_EXISTS', message: 'A passkey with this credential already exists on this account.' })
    }

    await db.insert(tables.credentials).values({
      userId: sessionUser.id,
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      backedUp: credential.backedUp,
      transports: credential.transports,
    })
  },
  async excludeCredentials(event, _userName) {
    const session = await getUserSession(event)
    if (!session?.user) {
      return []
    }

    const sessionUser = session.user
    return useDB()
      .select({
        id: tables.credentials.id,
        transports: tables.credentials.transports,
      })
      .from(tables.credentials)
      .where(eq(tables.credentials.userId, sessionUser.id))
  },
})
