import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import type { WebAuthnCredential } from '#auth-utils'

const timestampColumns = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()), // Auto-set on create
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()), // Auto-set on create (needs trigger or manual update for 'on update')
}

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  email: text('email').notNull().unique(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }), // Can be null if never logged in
  ...timestampColumns,
})

export const credentials = sqliteTable('credentials', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  id: text('id').notNull().primaryKey(), // WebAuthn Credential IDs are unique strings, safer as PK
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull(),
  backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
  transports: text('transports', { mode: 'json' }).notNull().$type<WebAuthnCredential['transports']>(),
  ...timestampColumns,
}, table => ({
  userIndex: index('credentials_user_idx').on(table.userId), // Index for faster lookups by user
}))

// ── OAuth Accounts Table ──────────────────────────────────────

export const oauthAccounts = sqliteTable('oauth_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'google', 'github', 'discord', etc.
  providerAccountId: text('provider_account_id').notNull(), // Google sub, GitHub user id, etc.
  email: text('email'), // Provider email (display only)
  name: text('name'), // Provider display name
  avatarUrl: text('avatar_url'), // Provider avatar
  ...timestampColumns,
}, table => [
  unique().on(table.provider, table.providerAccountId), // One link per provider account globally
  unique().on(table.userId, table.provider), // One provider type per user
  index('oauth_accounts_user_idx').on(table.userId),
])

// Relations (useful for queries)
export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ many, one }) => ({
  credentials: many(credentials),
  oauthAccounts: many(oauthAccounts),
}))

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}))
