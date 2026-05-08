import { APP_MANIFEST } from '#shared/constants/manifest'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const config = useRuntimeConfig()

  if (!config.resend.apiKey) {
    console.warn('[Email] Resend API key not configured, skipping email send')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.resend.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    })

    if (!response.ok) {
      const message = await response.text()
      console.error('[Email] Failed to send email:', message)
      return false
    }

    return true
  }
  catch (error) {
    console.error('[Email] Failed to send email:', error)
    return false
  }
}

export function sendVerificationEmail(to: string, username: string, token: string): Promise<boolean> {
  const APP_NAME = APP_MANIFEST.name
  const config = useRuntimeConfig()
  const baseUrl = config.public.url

  const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`

  return sendEmail({
    to,
    subject: `Verify your email - ${APP_NAME}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #111; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Hi <strong>${username}</strong>, thanks for signing up for ${APP_NAME}! Please verify your email address by clicking the button below.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 500; margin: 16px 0 24px;">
          Verify Email
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #555; word-break: break-all;">${verifyUrl}</a>
        </p>
        <p style="color: #888; font-size: 13px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  })
}

export function sendPasswordResetEmail(to: string, username: string, token: string): Promise<boolean> {
  const APP_NAME = APP_MANIFEST.name
  const config = useRuntimeConfig()
  const baseUrl = config.public.url

  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

  return sendEmail({
    to,
    subject: `Reset your password - ${APP_NAME}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #111; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Hi <strong>${username}</strong>, we received a request to reset your password for your ${APP_NAME} account. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 500; margin: 16px 0 24px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #555; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #888; font-size: 13px;">This link expires in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
      </div>
    `,
  })
}
