import { eq, and, isNull, lt } from 'drizzle-orm'
import type { DBAuthToken } from '#shared/db'
import { AuthTokenType } from '#shared/commonEnums'
import { EMAIL_VERIFICATION_EXPIRY_MS, PASSWORD_RESET_EXPIRY_MS, RESEND_COOLDOWN_MS } from '#shared/constants/authTokens'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

class AuthTokenService {
  private static instance: AuthTokenService

  private get db() {
    return useDB()
  }

  public static getInstance(): AuthTokenService {
    if (!AuthTokenService.instance) {
      AuthTokenService.instance = new AuthTokenService()
    }
    return AuthTokenService.instance
  }

  async createToken(userId: number, type: AuthTokenType): Promise<string> {
    const token = generateToken()
    const expiresAt = new Date(
      Date.now() + (type === AuthTokenType.EmailVerification ? EMAIL_VERIFICATION_EXPIRY_MS : PASSWORD_RESET_EXPIRY_MS),
    )

    await this.db
      .insert(tables.authTokens)
      .values({ userId, token, type, expiresAt })

    return token
  }

  async verifyToken(token: string, type: AuthTokenType): Promise<DBAuthToken | null> {
    const record = await this.db
      .select()
      .from(tables.authTokens)
      .where(
        and(
          eq(tables.authTokens.token, token),
          eq(tables.authTokens.type, type),
          isNull(tables.authTokens.usedAt),
        ),
      )
      .get()

    if (!record) return null
    if (record.expiresAt < new Date()) return null

    return record
  }

  async markUsed(tokenId: number): Promise<void> {
    await this.db
      .update(tables.authTokens)
      .set({ usedAt: new Date() })
      .where(eq(tables.authTokens.id, tokenId))
  }

  async invalidateUserTokens(userId: number, type: AuthTokenType): Promise<void> {
    await this.db
      .update(tables.authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(tables.authTokens.userId, userId),
          eq(tables.authTokens.type, type),
          isNull(tables.authTokens.usedAt),
        ),
      )
  }

  async hasRecentToken(userId: number, type: AuthTokenType): Promise<boolean> {
    const cutoff = new Date(Date.now() - RESEND_COOLDOWN_MS)
    const recent = await this.db
      .select()
      .from(tables.authTokens)
      .where(
        and(
          eq(tables.authTokens.userId, userId),
          eq(tables.authTokens.type, type),
          isNull(tables.authTokens.usedAt),
        ),
      )
      .get()

    return !!recent && !!recent.createdAt && recent.createdAt > cutoff
  }

  async cleanupExpired(): Promise<void> {
    await this.db
      .delete(tables.authTokens)
      .where(lt(tables.authTokens.expiresAt, new Date()))
  }
}

export default AuthTokenService.getInstance()
