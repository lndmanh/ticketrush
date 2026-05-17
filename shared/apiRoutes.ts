import type { NuxtSecurityRouteRules } from 'nuxt-security'

export const apiRoutes = {
  API_PREFIX: '/api/',
  ADMIN_API_PREFIX: '/api/admin',

  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_EVENTS: '/api/admin/events',
  ADMIN_EVENT_AUTOSAVE: '/api/admin/events/autosave',
  ADMIN_EVENT_AUTOSAVES: '/api/admin/events/autosaves',
  ADMIN_IMAGE_UPLOAD: '/api/admin/uploads/images',
  ADMIN_TRANSACTIONS: '/api/admin/transactions',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_USERS_DELETE: '/api/admin/users/delete',
  ADMIN_VENUES: '/api/admin/venues',
  ADMIN_WAITING_ROOM_SETTINGS: '/api/admin/waiting-room-settings',
  FLAGS_EVALUATE: '/api/flags',

  EVENTS: '/api/events',

  TICKETS: '/api/tickets',

  CHECKOUT_ACTIVE: '/api/checkout/active',
  CHECKOUT_CONFIRM: '/api/checkout/confirm',
  CHECKOUT_START: '/api/checkout/start',

  EVENT_SEARCH: '/api/events/search',

  AUTH_LOGIN: '/auth/login',
  AUTH_LOGIN_PASSWORD: '/api/auth/login-password',
  AUTH_REGISTER: '/auth/register',
  AUTH_REGISTER_PASSWORD: '/api/auth/register-password',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_FORGOT_PASSWORD_REQUEST: '/api/auth/forgot-password',
  AUTH_RESEND_VERIFICATION: '/api/auth/resend-verification',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_GOOGLE: '/api/auth/google',
  AUTH_GOOGLE_ONE_TAP: '/api/auth/google-one-tap',
  AUTH_OAUTH_URL: '/api/auth/oauth/url',
  AUTH_OAUTH_UNLINK: '/api/auth/oauth/unlink',
  AUTH_ACCOUNT_STATUS: '/api/auth/account-status',
  MY_PASSKEYS: '/api/users/me/passkeys',
  MY_PASSWORD: '/api/users/me/password',

  MY_PROFILE: '/api/users/me',
  SAVED_ATTENDEES: '/api/saved-attendees',
  SAVED_ATTENDEE_SELF_STATUS: '/api/saved-attendees/self-status',
  ADMIN_TASKS_RELEASE_HOLDS: '/api/admin/tasks/release-holds',
  ADMIN_TASKS_ADMIT_QUEUE: '/api/admin/tasks/admit-queue',
  ADMIN_TASKS_SEED_ADMIN: '/api/admin/tasks/seed-admin',

  checkout: (orderId: string | number) => `/api/checkout/${orderId}`,
  adminEvent: (eventId: string | number) => `/api/admin/events/${eventId}`,
  adminEventDashboard: (eventId: string | number) => `/api/admin/events/${eventId}/dashboard`,
  adminEventOps: (eventId: string | number) => `/api/admin/events/${eventId}/ops`,
  adminEventTranslations: (eventId: string | number) => `/api/admin/events/${eventId}/translations`,
  adminEventTranslation: (eventId: string | number, locale: string) => `/api/admin/events/${eventId}/translations/${locale}`,
  adminEventPublish: (eventId: string | number) => `/api/admin/events/${eventId}/publish`,
  adminEventUnpublish: (eventId: string | number) => `/api/admin/events/${eventId}/unpublish`,
  adminEventSessions: (eventId: string | number) => `/api/admin/events/${eventId}/sessions`,
  adminEventSession: (eventId: string | number, sessionId: string | number) => `/api/admin/events/${eventId}/sessions/${sessionId}`,
  adminEventSessionPricing: (eventId: string | number, sessionId: string | number) => `/api/admin/events/${eventId}/sessions/${sessionId}/pricing`,
  adminEventSessionSeatOverrides: (eventId: string | number, sessionId: string | number) => `/api/admin/events/${eventId}/sessions/${sessionId}/seat-overrides`,
  adminEventSessionVenueSync: (eventId: string | number, sessionId: string | number) => `/api/admin/events/${eventId}/sessions/${sessionId}/venue-sync`,
  adminEventAutosave: (draftKey: string) => `/api/admin/events/autosaves/${draftKey}`,
  adminEventAutosaveConvert: (draftKey: string) => `/api/admin/events/autosaves/${draftKey}/convert`,
  adminVenue: (venueId: string | number) => `/api/admin/venues/${venueId}`,
  adminVenueTranslations: (venueId: string | number) => `/api/admin/venues/${venueId}/translations`,
  adminVenueTranslation: (venueId: string | number, locale: string) => `/api/admin/venues/${venueId}/translations/${locale}`,
  adminUser: (userId: string | number) => `/api/admin/users/${userId}`,
  adminUserLock: (userId: string | number) => `/api/admin/users/${userId}/lock`,
  event: (slug: string) => `/api/events/${slug}`,
  eventSession: (sessionId: string | number) => `/api/event-sessions/${sessionId}`,
  eventSessionGate: (sessionId: string | number) => `/api/event-sessions/${sessionId}/gate`,
  eventSessionCaptchaPass: (sessionId: string | number) => `/api/event-sessions/${sessionId}/captcha-pass`,
  eventSessionSeatmap: (sessionId: string | number) => `/api/event-sessions/${sessionId}/seatmap`,
  eventSessionSeatmapVersion: (sessionId: string | number) => `/api/event-sessions/${sessionId}/seatmap-version`,
  eventSessionSeatmapSocket: (sessionId: string) => `/ws/event-sessions/${sessionId}/seats`,
  eventSessionQueueSocket: (sessionId: string | number) => `/ws/event-sessions/${sessionId}/queue`,
  eventSessionHolds: (sessionId: string | number) => `/api/event-sessions/${sessionId}/holds`,
  eventSessionQueueStatus: (sessionId: string | number) => `/api/event-sessions/${sessionId}/queue/status`,
  eventSessionQueueJoin: (sessionId: string | number) => `/api/event-sessions/${sessionId}/queue/join`,
  eventSessionQueueLeave: (sessionId: string | number) => `/api/event-sessions/${sessionId}/queue/leave`,
  ticket: (ticketId: string | number) => `/api/tickets/${ticketId}`,
  userProfile: (userId: string | number) => `/api/users/${userId}/profile`,
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
  '/settings/**': {
    ssr: false,
    prerender: false,
  },
  // Directory-level redirects are auto-generated from .navigation.yml files
  // by the ~/modules/navigation-redirects module at build time
} as const
