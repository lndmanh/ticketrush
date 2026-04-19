import { handleOAuthSuccess } from '~~/server/utils/oauth'

const googleHandler = defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
  },
  async onSuccess(event, { user }) {
    return handleOAuthSuccess(event, 'google', {
      id: user.sub,
      email: user.email,
      name: user.name,
      avatarUrl: user.picture,
    })
  },
  onError(event, error) {
    console.error('[Google OAuth] Error:', error)
    return sendRedirect(event, '/auth/login?error=oauth-error')
  },
})

const githubHandler = defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user }) {
    return handleOAuthSuccess(event, 'github', {
      id: String(user.id),
      email: user.email || '',
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
    })
  },
  onError(event, error) {
    console.error('[GitHub OAuth] Error:', error)
    return sendRedirect(event, '/auth/login?error=oauth-error')
  },
})

export default defineEventHandler(async (event) => {
  const provider = getRouterParam(event, 'provider') || ''

  switch (provider) {
    case 'google':
      return googleHandler(event)
    case 'github':
      return githubHandler(event)
    default:
      throw createError({
        statusCode: 404,
        statusMessage: `OAuth provider '${provider}' is not supported.`,
      })
  }
})
