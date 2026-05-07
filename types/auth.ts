export interface OAuthPopupCompleteMessage {
  type: 'oauth:complete'
  url: string
}

export interface OAuthUrlData {
  url: string
}

export interface OAuthProfile {
  id: string
  email: string
  name: string
  avatarUrl?: string
}
