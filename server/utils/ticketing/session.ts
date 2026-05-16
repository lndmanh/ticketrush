export const TICKETING_SESSION_COOKIE = 'ticketrush-session'

export function readTicketingSessionKeyFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null
  }

  const cookieParts = cookieHeader.split(';')
  for (const cookiePart of cookieParts) {
    const [rawName, ...rawValueParts] = cookiePart.trim().split('=')
    if (rawName !== TICKETING_SESSION_COOKIE) {
      continue
    }

    const rawValue = rawValueParts.join('=')
    if (!rawValue) {
      return null
    }

    try {
      return decodeURIComponent(rawValue)
    }
    catch {
      return rawValue
    }
  }

  return null
}

export function getTicketingSessionKey(event: H3Event): string {
  const existing = getCookie(event, TICKETING_SESSION_COOKIE)
  if (existing) {
    return existing
  }

  const created = crypto.randomUUID().replaceAll('-', '')
  setCookie(event, TICKETING_SESSION_COOKIE, created, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return created
}
