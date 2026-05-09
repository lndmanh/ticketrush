import type { NuxtSecurityRouteRules } from 'nuxt-security'

export const apiRoutes = {
  ADMIN_FEATURE_FLAGS: '/api/admin/feature-flags',
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_EVENTS: '/api/admin/events',
  ADMIN_EVENT_AUTOSAVE: '/api/admin/events/autosave',
  ADMIN_EVENT_AUTOSAVES: '/api/admin/events/autosaves',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_USERS_DELETE: '/api/admin/users/delete',
  ADMIN_VENUES: '/api/admin/venues',
  ADMIN_WAITING_ROOM_SETTINGS: '/api/admin/waiting-room-settings',
  FLAGS_EVALUATE: '/api/flags',

  CHECKOUT_CONFIRM: '/api/checkout/confirm',
  CHECKOUT_START: '/api/checkout/start',

  EVENT_SEARCH: '/api/events/search',

  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_GOOGLE: '/api/auth/google',
  AUTH_OAUTH_URL: '/api/auth/oauth/url',
  AUTH_OAUTH_UNLINK: '/api/auth/oauth/unlink',
  MY_PASSKEYS: '/api/users/me/passkeys',

  MY_PROFILE: '/api/users/me',
  SAVED_ATTENDEES: '/api/saved-attendees',

  adminEvent: (eventId: string | number) => `/api/admin/events/${eventId}`,
  adminEventDashboard: (eventId: string | number) => `/api/admin/events/${eventId}/dashboard`,
  adminEventOps: (eventId: string | number) => `/api/admin/events/${eventId}/ops`,
  adminEventPublish: (eventId: string | number) => `/api/admin/events/${eventId}/publish`,
  adminEventUnpublish: (eventId: string | number) => `/api/admin/events/${eventId}/unpublish`,
  adminEventSessions: (eventId: string | number) => `/api/admin/events/${eventId}/sessions`,
  adminEventSession: (eventId: string | number, sessionId: string | number) => `/api/admin/events/${eventId}/sessions/${sessionId}`,
  adminEventAutosave: (draftKey: string) => `/api/admin/events/autosaves/${draftKey}`,
  adminEventAutosaveConvert: (draftKey: string) => `/api/admin/events/autosaves/${draftKey}/convert`,
  adminVenue: (venueId: string | number) => `/api/admin/venues/${venueId}`,
  adminUser: (userId: string | number) => `/api/admin/users/${userId}`,
  event: (slug: string) => `/api/events/${slug}`,
  eventSession: (sessionId: string | number) => `/api/event-sessions/${sessionId}`,
  eventSessionGate: (sessionId: string | number) => `/api/event-sessions/${sessionId}/gate`,
  eventSessionSeatmap: (sessionId: string | number) => `/api/event-sessions/${sessionId}/seatmap`,
  eventSessionHolds: (sessionId: string | number) => `/api/event-sessions/${sessionId}/holds`,
  eventSessionQueueStatus: (sessionId: string | number) => `/api/event-sessions/${sessionId}/queue/status`,
  eventSessionQueueJoin: (sessionId: string | number) => `/api/event-sessions/${sessionId}/queue/join`,
  eventSessionQueueLeave: (sessionId: string | number) => `/api/event-sessions/${sessionId}/queue/leave`,
  savedAttendee: (attendeeId: string | number) => `/api/saved-attendees/${attendeeId}`,
} as const

const apiRules: NuxtSecurityRouteRules = {
  rateLimiter: {
    tokensPerInterval: 150,
    interval: 60000, // 60 seconds
    headers: true,
    throwError: true,
  },
}

// the route rules of the most outer apis should be defined first
export const routeRules = {
  '/api/**': {
    security: apiRules,
  },
  '/admin/**': {
    ssr: false,
    prerender: false,
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
    index: false,
  },
  '/admin/studio/login/**': {
    ssr: true,
    index: false,
  },
  // Directory-level redirects are auto-generated from .navigation.yml files
  // by the ~/modules/navigation-redirects module at build time
} as const
