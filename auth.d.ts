declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    name: string
    isAdmin: boolean
  }

  interface UserSession {
    loggedInAt?: Date
  }

  interface SecureSessionData { }
}

/**
 * Type for the authenticated user from session
 * Use this when accessing session.user to get proper typing
 */
export type SessionUser = {
  id: number
  username: string
  name: string
  isAdmin: boolean
}
