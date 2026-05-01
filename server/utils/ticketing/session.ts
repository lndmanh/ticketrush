const TICKETING_SESSION_COOKIE = 'ticketrush-session'

export function getTicketingSessionKey(event: H3Event) {
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
