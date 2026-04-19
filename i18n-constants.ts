export const locales = ['en', 'vi']
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'
export const fallbackLocales: Locale[] = ['en']
export const browserFallbackLocale: Locale = 'en'

export const lanugageNames: { [locale in Locale]: string } = {
  en: 'English',
  vi: 'Tiếng Việt',
}
