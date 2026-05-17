import type { H3Event } from 'h3'
import type { GoogleOneTapStatus } from '~~/types/auth'
import userService from '~~/server/utils/database/user'
import oauthAccountService from '~~/server/utils/database/oauthAccount'

export interface OAuthProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export type OAuthLoginCompletionResult = {
  status: GoogleOneTapStatus
  userId: number
} | {
  status: 'missing-user'
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

function getPopupRedirectTarget(event: H3Event, fallback: string) {
  if (getCookie(event, 'oauth_popup') !== '1') {
    return fallback
  }

  const origin = getRequestURL(event).origin
  const redirectTo = getCookie(event, 'oauth_redirect_to') || fallback
  return `/auth/oauth/popup?redirectTo=${encodeURIComponent(safeRedirectPath(redirectTo, origin))}`
}

function clearPopupOAuthCookies(event: H3Event) {
  deleteCookie(event, 'oauth_popup', { path: '/' })
  deleteCookie(event, 'oauth_redirect_to', { path: '/' })
}

export function sendOAuthRedirect(event: H3Event, fallback: string) {
  const target = getPopupRedirectTarget(event, fallback)
  clearPopupOAuthCookies(event)
  return sendRedirect(event, target)
}

/**
 * Generate a valid username from a provider email address.
 * Strips the domain, converts to lowercase, replaces invalid chars, and truncates.
 * If username is taken, appends a random suffix.
 */
async function generateUniqueUsername(email: string): Promise<string> {
  const handle = email.split('@')[0] || 'user'

  let base = handle
    .toLowerCase()
    .replace(/\./g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40)

  if (base.length < 3) {
    base = `user-${base}`
  }

  let username = base
  let existing = await userService.getByUsername(username)

  if (!existing) return username

  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6)
    username = `${base}-${suffix}`.slice(0, 50)
    existing = await userService.getByUsername(username)
    if (!existing) return username
  }

  return `${base}-${Date.now().toString(36)}`.slice(0, 50)
}

export async function completeOAuthLogin(event: H3Event, provider: string, profile: OAuthProfile): Promise<OAuthLoginCompletionResult> {
  const linked = await oauthAccountService.getByProviderAccount(provider, profile.id)

  if (linked) {
    const dbUser = await userService.getById(linked.userId)
    if (!dbUser) {
      return { status: 'missing-user' }
    }

    await userService.update({ id: dbUser.id, lastLoginAt: new Date() })
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        isAdmin: dbUser.isAdmin,
      },
    })

    return { status: 'signed-in', userId: dbUser.id }
  }

  const username = await generateUniqueUsername(profile.email)

  const newUser = await userService.create({
    username,
    name: profile.name || username,
    email: profile.email,
    password: '',
    emailVerified: true,
    isAdmin: false,
  })

  await oauthAccountService.link({
    userId: newUser.id,
    provider,
    providerAccountId: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl ?? null,
  })

  await setUserSession(event, {
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
    },
  })

  return { status: 'created', userId: newUser.id }
}

/**
 * Handle successful authentication from an OAuth provider.
 * Manages account linking, sign-in, and account creation safely.
 */
export async function handleOAuthSuccess(event: H3Event, provider: string, profile: OAuthProfile) {
  const session = await getUserSession(event)
  const isLoggedIn = !!session?.user?.id

  // ── MODE 1: Link Provider to existing logged-in account ──
  if (isLoggedIn) {
    const currentUserId = session.user.id

    // Check if this provider account is already linked to someone
    const existingLink = await oauthAccountService.getByProviderAccount(provider, profile.id)
    if (existingLink) {
      if (existingLink.userId === currentUserId) {
        return sendOAuthRedirect(event, `/settings/security?error=oauth-already-connected&provider=${provider}`)
      }
      return sendOAuthRedirect(event, `/settings/security?error=oauth-already-linked&provider=${provider}`)
    }

    // Check if user already has a different account for this provider linked
    const userProviderLink = await oauthAccountService.getByUserAndProvider(currentUserId, provider)
    if (userProviderLink) {
      return sendOAuthRedirect(event, `/settings/security?error=oauth-already-connected&provider=${provider}`)
    }

    // Link the provider account
    await oauthAccountService.link({
      userId: currentUserId,
      provider,
      providerAccountId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl ?? null,
    })

    return sendOAuthRedirect(event, `/settings/security?success=oauth-linked&provider=${provider}`)
  }

  // ── MODE 2: Sign in or sign up (user is NOT logged in) ──

  const completion = await completeOAuthLogin(event, provider, profile)
  if (completion.status === 'missing-user') {
    return sendOAuthRedirect(event, '/auth/login?error=unknown')
  }

  return sendOAuthRedirect(event, '/')
}
