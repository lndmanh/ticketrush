import { apiRoutes } from '../apiRoutes'

export interface OAuthProviderConfig {
  id: string
  name: string
  route: string
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    id: 'google',
    name: 'Google',
    route: apiRoutes.AUTH_GOOGLE,
  },
}

export const AVAILABLE_PROVIDERS = Object.values(OAUTH_PROVIDERS)
