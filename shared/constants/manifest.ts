import { defaultLocale } from '../../i18n-constants'

export const APP_MANIFEST = {
  name: 'TicketRush',
  short_name: 'TicketRush',
  description: 'A ticket-selling platform for organizers to publish events, manage guests, and streamline check-in.',
  start_url: '/',
  display: 'standalone',
  display_override: ['window-controls-overlay', 'standalone'],
  background_color: '#ffffff',
  theme_color: '#8b5cf6',
  dir: 'ltr',
  lang: defaultLocale,
  orientation: 'any',
  scope: '/',
  categories: ['business', 'events', 'productivity', 'utilities'],
  iarc_rating_id: '',
  icons: [
    {
      src: 'pwa-64x64.png',
      sizes: '64x64',
      type: 'image/png',
    },
    {
      src: 'pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  screenshots: [
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      form_factor: 'wide',
    },
    {
      src: 'pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      form_factor: 'narrow',
    },
  ],
  shortcuts: [
    {
      name: 'Home',
      short_name: 'Home',
      description: 'Go to home page',
      url: '/',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Organizer Console',
      short_name: 'Console',
      description: 'Open the organizer console',
      url: '/admin',
    },
  ],
  scope_extensions: [
    {
      origin: '*',
    },
  ],
}

// SEO-related constants
export const SEO_CONFIG = {
  author: 'TicketRush',
  keywords: 'ticket selling, event tickets, event management, organizer console, guest check-in, Vietnam events',
  ogImage: '/pwa-512x512.png',
  twitterCard: 'summary_large_image' as const,
  robots: 'index, follow',
  colorScheme: 'light dark',
} as const
