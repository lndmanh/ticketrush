import type { tables } from '~~/server/utils/db'

export type User = typeof tables.users.$inferSelect
export type DBPasskey = typeof tables.credentials.$inferSelect
export type DBOAuthAccount = typeof tables.oauthAccounts.$inferSelect
