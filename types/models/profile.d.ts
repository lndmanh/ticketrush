export interface LinkedAccount {
  provider: string
  email: string | null
  name: string | null
  avatarUrl: string | null
  linkedAt: Date
}

export interface UserProfileModel {
  id: number
  username: string
  name: string
  email: string
  createdAt: Date
  lastLoginAt: Date
  hasPassword: boolean
  passkeyCount: number
  isAdmin: boolean
  linkedAccounts: LinkedAccount[]
}
