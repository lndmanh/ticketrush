import { eq } from 'drizzle-orm'
import { useKV } from '~~/server/utils/kv'

export default defineWebAuthnAuthenticateEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    await useKV().set(`auth:challenge:${attemptId}`, challenge, { ttl: 60 })
  },
  async getChallenge(event, attemptId) {
    const challenge = await useKV().get<string>(`auth:challenge:${attemptId}`)
    if (!challenge) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request. The authentication challenge has expired or was not found. Please try again.',
      })
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
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found. The specified passkey credential was not found.',
      })
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
