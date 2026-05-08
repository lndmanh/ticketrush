import type { MessagePayload } from '~~/types/common'

export interface OAuthPopupCompleteMessage {
  type: 'oauth:complete'
  url: string
}

export interface OAuthUrlData {
  url: string
}

export type OAuthUrlPayload = OAuthUrlData

export interface OAuthUnlinkPayload {
  unlinked: true
}

export interface OAuthProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
}
