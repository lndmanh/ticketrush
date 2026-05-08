import { z } from 'zod'
import { eq } from 'drizzle-orm'
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
    displayName: z.string().min(1).trim(),
  }).parseAsync(user),
  async onSuccess(event, { user, credential }) {
    const db = useDB()

    // Check if user is already logged in (for adding passkey to existing account)
    const session = await getUserSession(event)

    if (session?.user) {
      // User is logged in, add passkey to existing account
      const sessionUser = session.user

      // Verify the username matches the logged-in user
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

      // Add the credential to the existing user
      await db.insert(tables.credentials).values({
        userId: sessionUser.id,
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        backedUp: credential.backedUp,
        transports: credential.transports,
      })

      return // Don't create a new user or session
    }
  },
  async excludeCredentials(event, userName) {
    return useDB()
      .select({
        id: tables.credentials.id,
        transports: tables.credentials.transports,
      })
      .from(tables.users)
      .innerJoin(tables.credentials, eq(tables.credentials.userId, tables.users.id))
      .where(eq(tables.users.username, userName.toLowerCase().trim()))
  },
})
