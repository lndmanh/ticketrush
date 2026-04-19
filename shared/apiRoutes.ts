import type { NuxtSecurityRouteRules } from 'nuxt-security'

export const apiRoutes = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',

  MY_PROFILE: '/api/users/me',
  AUTH_GOOGLE: '/api/auth/google',
  AUTH_OAUTH_URL: '/api/auth/oauth/url',
  AUTH_OAUTH_UNLINK: '/api/auth/oauth/unlink',
}

const apiRules: NuxtSecurityRouteRules = {
  rateLimiter: {
    tokensPerInterval: 150,
    interval: 60000, // 60 seconds
    headers: true,
    throwError: true,
  },
}

export const routeRules = {
  '/api/**': {
    security: apiRules,
  },
  '/admin/**': {
    ssr: false,
    prerender: false,
  },
  '/pwa': {
    ssr: false,
  },
  '/docs/**': {
    swr: 3600,
  },
  '/blogs/**': {
    swr: 3600,
  },
  '/_studio/**': {
    ssr: true,
  },
  '/__nuxt_studio/**': {
    ssr: true,
  },
  '/admin/studio/login': {
    ssr: true,
    index: false, // Prevent index.html generation
  },
  '/admin/studio/login/**': {
    ssr: true,
    index: false,
  },
  // Directory-level redirects are auto-generated from .navigation.yml files
  // by the ~/modules/navigation-redirects module at build time
} as const
