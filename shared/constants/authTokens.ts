/** Email verification token expires in 24 hours */
export const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000

/** Password reset token expires in 1 hour */
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000

/** Minimum interval between resend requests (2 minutes) */
export const RESEND_COOLDOWN_MS = 2 * 60 * 1000
