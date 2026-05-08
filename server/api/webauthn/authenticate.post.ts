import { eq } from 'drizzle-orm'
import { useKV } from '~~/server/utils/kv'
import { apiError } from '~~/server/utils/apiResponse'

export default defineWebAuthnAuthenticateEventHandler({
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
  async allowCredentials(event, userName) {
    const db = useDB()

    const user = await db.query.users.findFirst({
      where: eq(tables.users.username, userName),
      with: {
        credentials: true,
      },
    })

    return user?.credentials || []
  },
  async getCredential(event, credentialID) {
    const credential = await useDB().query.credentials.findFirst({
      where: eq(tables.credentials.id, credentialID),
      with: {
        user: true,
      },
    })

    if (!credential) {
      throw apiError({ status: 404, statusText: 'Not Found', code: 'WEBAUTHN_CREDENTIAL_NOT_FOUND', message: 'The specified passkey credential was not found.' })
    }

    return credential
  },
  async onSuccess(event, { credential }) {
    await setUserSession(event, {
      user: {
        id: credential.user.id,
        name: credential.user.name,
        username: credential.user.username,
        isAdmin: credential.user.isAdmin,
      },
    })
  },
})
