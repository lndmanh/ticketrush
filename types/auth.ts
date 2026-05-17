import type { MessagePayload } from '~~/types/common'

export const OAUTH_POPUP_COMPLETE_STORAGE_KEY = 'oauth_popup_complete'
export const OAUTH_POPUP_COMPLETE_CHANNEL = 'oauth_popup_complete'

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

export type GoogleOneTapStatus = 'signed-in' | 'created'

export interface GoogleOneTapPayload {
  authenticated: true
  status: GoogleOneTapStatus
}
