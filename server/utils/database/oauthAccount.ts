import { and, eq } from 'drizzle-orm'

interface OAuthLinkInput {
  userId: number
  provider: string
  providerAccountId: string
  email?: string | null
  name?: string | null
  avatarUrl?: string | null
}

class OAuthAccountService {
  private static instance: OAuthAccountService

  private get db() {
    return useDB()
  }

  public static getInstance(): OAuthAccountService {
    if (!OAuthAccountService.instance) {
      OAuthAccountService.instance = new OAuthAccountService()
    }
    return OAuthAccountService.instance
  }

  /**
   * Find a linked account by provider + provider account ID
   */
  async getByProviderAccount(provider: string, providerAccountId: string) {
    return this.db
      .select()
      .from(tables.oauthAccounts)
      .where(
        and(
          eq(tables.oauthAccounts.provider, provider),
          eq(tables.oauthAccounts.providerAccountId, providerAccountId),
        ),
      )
      .get()
  }

  /**
   * Get all linked OAuth accounts for a user
   */
  async getByUserId(userId: number) {
    return this.db
      .select()
      .from(tables.oauthAccounts)
      .where(eq(tables.oauthAccounts.userId, userId))
      .all()
  }

  /**
   * Check if a user already has a specific provider linked
   */
  async getByUserAndProvider(userId: number, provider: string) {
    return this.db
      .select()
      .from(tables.oauthAccounts)
      .where(
        and(
          eq(tables.oauthAccounts.userId, userId),
          eq(tables.oauthAccounts.provider, provider),
        ),
      )
      .get()
  }

  /**
   * Link an OAuth provider to a user
   */
  async link(data: OAuthLinkInput) {
    return this.db
      .insert(tables.oauthAccounts)
      .values({
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        email: data.email ?? null,
        name: data.name ?? null,
        avatarUrl: data.avatarUrl ?? null,
      })
      .returning()
      .get()
  }

  /**
   * Unlink an OAuth provider from a user
   */
  async unlink(userId: number, provider: string) {
    return this.db
      .delete(tables.oauthAccounts)
      .where(
        and(
          eq(tables.oauthAccounts.userId, userId),
          eq(tables.oauthAccounts.provider, provider),
        ),
      )
  }

  /**
   * Count linked providers for a user (used for "can unlink" check)
   */
  async countByUserId(userId: number) {
    const accounts = await this.getByUserId(userId)
    return accounts.length
  }
}

export default OAuthAccountService.getInstance()
