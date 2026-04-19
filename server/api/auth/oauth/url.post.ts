import { z } from 'zod'
import { success } from '~~/server/utils/apiResponse'
import { OAUTH_PROVIDERS } from '#shared/constants/oauthProviders'

const oauthUrlBodySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  action: z.enum(['login', 'link']).optional(),
})

export default defineEventHandler(async (event) => {
  const { provider, action } = await readValidatedBody(event, body => oauthUrlBodySchema.parse(body))

  if (!Object.prototype.hasOwnProperty.call(OAUTH_PROVIDERS, provider)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported OAuth provider',
    })
  }

  const providerConfig = OAUTH_PROVIDERS[provider]
  const url = action === 'link' ? `${providerConfig.route}?action=link` : providerConfig.route

  return success({ url })
})
