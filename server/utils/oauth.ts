import type { H3Event } from 'h3'
import userService from '~~/server/utils/database/user'
import oauthAccountService from '~~/server/utils/database/oauthAccount'

export interface OAuthProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
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

/**
 * Handle successful authentication from an OAuth provider.
 * Manages account linking, sign-in, and account creation safely.
 */
export async function handleOAuthSuccess(event: H3Event, provider: string, profile: OAuthProfile) {
  const session = await getUserSession(event)
  const isLoggedIn = !!session?.user?.id

  // ── MODE 1: Link Provider to existing logged-in account ──
  if (isLoggedIn) {
    const currentUserId = session.user!.id

    // Check if this provider account is already linked to someone
    const existingLink = await oauthAccountService.getByProviderAccount(provider, profile.id)
    if (existingLink) {
      if (existingLink.userId === currentUserId) {
        return sendRedirect(event, `/settings/security?error=oauth-already-connected&provider=${provider}`)
      }
      return sendRedirect(event, `/settings/security?error=oauth-already-linked&provider=${provider}`)
    }

    // Check if user already has a different account for this provider linked
    const userProviderLink = await oauthAccountService.getByUserAndProvider(currentUserId, provider)
    if (userProviderLink) {
      return sendRedirect(event, `/settings/security?error=oauth-already-connected&provider=${provider}`)
    }

    // Link the provider account
    await oauthAccountService.link({
      userId: currentUserId,
      provider,
      providerAccountId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    })

    return sendRedirect(event, `/settings/security?success=oauth-linked&provider=${provider}`)
  }

  // ── MODE 2: Sign in or sign up (user is NOT logged in) ──

  // Check if this provider account is already linked to a user
  const linked = await oauthAccountService.getByProviderAccount(provider, profile.id)

  if (linked) {
    // User already exists, sign them in
    const dbUser = await userService.getById(linked.userId)
    if (!dbUser) {
      return sendRedirect(event, '/auth/login?error=unknown')
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

    return sendRedirect(event, '/')
  }

  // Sign up: Create new user account + link provider
  const username = await generateUniqueUsername(profile.email)

  const newUser = await userService.create({
    username,
    name: profile.name || username,
    email: profile.email,
    password: '',
    isAdmin: false,
  })

  await oauthAccountService.link({
    userId: newUser.id,
    provider,
    providerAccountId: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  })

  await setUserSession(event, {
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
    },
  })

  return sendRedirect(event, '/')
}
