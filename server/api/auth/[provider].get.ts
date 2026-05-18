import type { H3Event } from 'h3'
import { apiRoutes } from '#shared/apiRoutes'
import { handleOAuthSuccess, sendOAuthRedirect } from '~~/server/utils/oauth'

function getQueryString(value: string | string[] | undefined) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return ''
}

function safeRedirectPath(value: string, origin: string) {
  try {
    const parsed = new URL(value, origin)
    if (parsed.origin !== origin) {
      return '/'
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return '/'
  }
}

function rememberPopupOAuthRequest(event: H3Event) {
  const query = getQuery(event)
  if (getQueryString(query.popup) !== '1') {
    return
  }

  const origin = getRequestURL(event).origin
  const redirectTo = getQueryString(query.redirectTo)

  setCookie(event, 'oauth_popup', '1', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 600,
  })
  deleteCookie(event, 'oauth_redirect_to', { path: '/' })

  if (redirectTo) {
    setCookie(event, 'oauth_redirect_to', safeRedirectPath(redirectTo, origin), {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 600,
    })
  }
}

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
    return sendOAuthRedirect(event, `${apiRoutes.AUTH_LOGIN}?error=oauth-error`)
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
    return sendOAuthRedirect(event, `${apiRoutes.AUTH_LOGIN}?error=oauth-error`)
  },
})

export default defineEventHandler(async (event) => {
  rememberPopupOAuthRequest(event)

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
