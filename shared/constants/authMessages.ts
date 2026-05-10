/**
 * Authentication error messages for user-facing display
 */
export const AUTH_ERROR_MESSAGES = {
  // Registration errors
  'validation': 'Please check your input and try again. All fields are required.',
  'captcha': 'Security verification failed. Please refresh the page and try again.',
  'existed': 'This username is already taken. Please choose a different username.',
  'email-existed': 'This email is already in use. Please choose a different email.',
  'unknown': 'An unexpected error occurred. Please try again later.',

  // Login errors
  'invalid-credentials': 'Invalid username or password. Please check your credentials and try again.',

  // OAuth errors
  'oauth-already-linked': 'This account is already linked to another user.',
  'oauth-already-connected': 'You already have an account from this provider linked.',
  'oauth-error': 'Authentication failed. Please try again.',
  'not-authenticated': 'You need to be logged in to link an account.',
  'unlink-last-method': 'You can\'t unlink your only sign-in method. Set a password first.',
} as const

/**
 * Authentication success messages for user-facing display
 */
export const AUTH_SUCCESS_MESSAGES = {
  'oauth-linked': 'Account linked successfully!',
  'oauth-unlinked': 'Account unlinked successfully.',
} as const

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES

/**
 * Get user-friendly error message by error code
 */
export function getAuthErrorMessage(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null
  return AUTH_ERROR_MESSAGES[errorCode as AuthErrorCode] || 'An error occurred. Please try again.'
}
