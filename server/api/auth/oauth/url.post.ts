import { z } from 'zod'
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse'
import { OAUTH_PROVIDERS } from '#shared/constants/oauthProviders'
import type { OAuthUrlPayload } from '~~/types/auth'

const oauthUrlBodySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  action: z.enum(['login', 'link']).optional(),
  redirectTo: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => oauthUrlBodySchema.safeParse(body))
  if (!result.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please fix the highlighted fields.',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(result.error),
      cause: result.error,
    })
  }

  const { provider, action, redirectTo } = result.data

  if (!Object.prototype.hasOwnProperty.call(OAUTH_PROVIDERS, provider)) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Unsupported OAuth provider',
      code: 'UNSUPPORTED_OAUTH_PROVIDER',
    })
  }

  const providerConfig = OAUTH_PROVIDERS[provider]
  const params = new URLSearchParams({ popup: '1' })
  if (action === 'link') {
    params.set('action', 'link')
  }
  if (redirectTo) {
    params.set('redirectTo', redirectTo)
  }

  const url = `${providerConfig.route}?${params.toString()}`
  const response: OAuthUrlPayload = { url }
  return success(response)
})
