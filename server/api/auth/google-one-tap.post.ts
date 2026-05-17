import { z } from 'zod'
import type { GoogleOneTapPayload } from '~~/types/auth'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { completeOAuthLogin, type OAuthProfile } from '~~/server/utils/oauth'
import { verifyGoogleIdToken } from '~~/server/utils/googleIdentity'

const googleOneTapBodySchema = z.object({
  credential: z.string().trim().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (session?.user?.id) {
    return success<GoogleOneTapPayload>({ authenticated: true, status: 'signed-in' })
  }

  const bodyResult = googleOneTapBodySchema.safeParse(await readBody(event))
  if (!bodyResult.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Invalid request body.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(bodyResult.error),
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const googleOneTapClientId = runtimeConfig.public.googleOneTapClientId
  const clientId = typeof googleOneTapClientId === 'string' ? googleOneTapClientId.trim() : ''
  if (clientId.length === 0) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Google One Tap is not configured.',
      code: 'GOOGLE_ONE_TAP_NOT_CONFIGURED',
    })
  }

  let googlePayload: Awaited<ReturnType<typeof verifyGoogleIdToken>>
  try {
    googlePayload = await verifyGoogleIdToken({ token: bodyResult.data.credential, audience: clientId })
  }
  catch {
    throw apiError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Google One Tap credential is invalid.',
      code: 'INVALID_GOOGLE_ONE_TAP_CREDENTIAL',
    })
  }

  const profile: OAuthProfile = {
    id: googlePayload.subject,
    email: googlePayload.email,
    name: googlePayload.name,
    ...(googlePayload.picture === undefined ? {} : { avatarUrl: googlePayload.picture }),
  }

  const loginResult = await completeOAuthLogin(event, 'google', profile)
  if (loginResult.status === 'missing-user') {
    throw apiError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'The linked Google account could not be found.',
      code: 'UNKNOWN_GOOGLE_ACCOUNT',
    })
  }

  return success<GoogleOneTapPayload>({ authenticated: true, status: loginResult.status })
})
