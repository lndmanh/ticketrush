import { APP_MANIFEST, SEO_CONFIG } from './shared/constants/manifest'
import { routeRules } from './shared/apiRoutes'
import { defaultLocale, browserFallbackLocale, lanugageNames, locales } from './i18n-constants'
import { DOCS_CONFIG } from './docs.config'

export default defineNuxtConfig({
  modules: [
    'nuxt-security',
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/seo',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/image',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/device',
    '@nuxthub/core',
    'nuxt-auth-utils',
    '@nuxtjs/color-mode',
    '@nuxtjs/turnstile',
    '@sentry/nuxt/module',
    'motion-v/nuxt',
  ],

  $production: {
    image: {
      provider: 'cloudflare',
      cloudflare: { baseURL: '/' },
    },
  },

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  app: {
    head: {
      title: APP_MANIFEST.name,
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  css: [
    '~/assets/css/tailwind.css',
  ],

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    name: APP_MANIFEST.name,
  },

  colorMode: {
    preference: 'system', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    classSuffix: '',
    storage: 'cookie',
    disableTransition: true,
  },
  runtimeConfig: {
    public: {
      version: process.env.npm_package_version || '0.0.0',
      sentry: {
        dsn: '',
      },
      url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      docs: DOCS_CONFIG,
    },
    turnstile: {
      secretKey: '',
    },
    defaultAdminPassword: '',
    session: {
      password: '',
    },
  },

  routeRules: routeRules,
  future: {
    compatibilityVersion: 5,
  },

  experimental: {
    emitRouteChunkError: 'automatic-immediate',
  },

  compatibilityDate: '2026-01-30',

  nitro: {
    compressPublicAssets: true,
    minify: true,
    preset: 'cloudflare_module',
    rollupConfig: {
      external: ['sharp', /^@img\/sharp.*/],
    },
    experimental: {
      tasks: true,
      wasm: true,
      websocket: true,
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    prerender: {
      ignore: [
        '/admin',
        '/admin/**',
        '/settings',
        '/settings/**',
        '/docs',
        '/docs/**',
        '/blogs',
        '/blogs/**',
        '/__og-image__/static/pwa',
        '/api/**', // Ignore ALL API routes (not just /api/studio/**)
        '/auth/**', // Auth0 routes should be SSR (optional, not required for Studio)
      ],
    },
    typescript: {
      tsConfig: {
        exclude: ['**/dist/**', '**/node_modules/**'],
      },
    },
  },

  hub: {
    // D1 database
    db: 'sqlite',
    // KV namespace (binding defaults to 'KV')
    kv: true,
    // Cache KV namespace (binding defaults to 'CACHE')
    cache: true,
    // R2 bucket (binding defaults to 'BLOB')
    blob: false,
  },

  vite: {
    optimizeDeps: {
      include: ['vue'],
    },
    build: {
      rollupOptions: {
        external: [
          'sharp',
        ],
      },
    },
  },

  auth: {
    webAuthn: true,
  },

  eslint: {
    config: {
      stylistic: {
        semi: false,
        quotes: 'single',
        indent: 2,
      },
    },
  },

  fonts: {
    families: [
      {
        name: 'Plus Jakarta Sans',
        preload: true,
        provider: 'google',
        global: true,
      },
      {
        name: 'JetBrains Mono',
        preload: true,
        provider: 'google',
        global: true,
      },
    ],
  },

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale,
    detectBrowserLanguage: {
      fallbackLocale: browserFallbackLocale,
    },
    locales: locales.map(locale => ({
      name: lanugageNames[locale],
      code: locale,
      file: `${locale}.json`,
    })),
  },

  ogImage: false, // currently we are disabling this since it makes server build file size very large due to the sharp dependency. You can re-enable it if you need dynamic OG image generation.

  schemaOrg: {
    identity: 'Organization',
  },

  security: { // we have to disable some of the security features in order to allow prerender work. If enabled, headers file will contain a lot of nonce and when deploy will cause Cloudflare to reject the worker due to header line limit exceeded
    strict: true,
    rateLimiter: false,
    nonce: false,
    ssg: false,
    sri: false,
    headers: {
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      crossOriginEmbedderPolicy: 'unsafe-none',
      contentSecurityPolicy: {
        'script-src': ['\'self\'', 'https:', '\'unsafe-inline\'', '\'wasm-unsafe-eval\''],
        'style-src': ['\'self\'', 'https:', '\'unsafe-inline\'', 'https://challenges.cloudflare.com'],
        'img-src': ['\'self\'', 'data:', 'https:'],
        'media-src': ['\'self\'', 'blob:', 'https:'],
        'connect-src': ['\'self\'', 'https:'],
        'font-src': ['\'self\'', 'https://*.gstatic.com'],
        'worker-src': ['\'self\'', 'blob:'],
        'frame-src': ['\'self\'', 'https:'],
      },
      permissionsPolicy: {
        'fullscreen': ['self'],
        'picture-in-picture': ['self'],
        'web-share': ['self'],
        'autoplay': ['self'],
      },
    },
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: 'no-name-studio',
      project: 'nuxt-starter-kit',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    },
    silent: true,
    telemetry: false,
    sourcemaps: {
      filesToDeleteAfterUpload: '*.map',
    },
  },

  seo: {
    meta: {
      description: APP_MANIFEST.description,
      keywords: SEO_CONFIG.keywords,
      themeColor: APP_MANIFEST.theme_color,
      applicationName: APP_MANIFEST.short_name,
      appleMobileWebAppTitle: APP_MANIFEST.short_name,
      appleMobileWebAppCapable: 'yes',
      appleMobileWebAppStatusBarStyle: 'black-translucent',
      mobileWebAppCapable: 'yes',
      msapplicationTileColor: APP_MANIFEST.background_color,
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
      ogImage: '/pwa-512x512.png',
      twitterTitle: APP_MANIFEST.name,
      twitterDescription: APP_MANIFEST.description,
      twitterImage: '/pwa-512x512.png',
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  sitemap: {
    zeroRuntime: true,
    exclude: ['/admin/**', '/settings/**'],
  },

  turnstile: {
    siteKey: process.env.NUXT_TURNSTILE_SITE_KEY,
  },
})
