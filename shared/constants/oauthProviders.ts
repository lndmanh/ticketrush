export interface OAuthProviderConfig {
  id: string
  name: string
  route: string
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    id: 'google',
    name: 'Google',
    route: '/api/auth/google',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    route: '/api/auth/github',
  },
}

export const AVAILABLE_PROVIDERS = Object.values(OAUTH_PROVIDERS)
