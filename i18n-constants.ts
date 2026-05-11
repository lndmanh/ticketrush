export type Locale = 'vi' | 'en'
export const locales: readonly Locale[] = ['vi', 'en']

export const sourceLocale: Locale = 'vi'
export const defaultLocale: Locale = sourceLocale
export const fallbackLocales: Locale[] = [sourceLocale]
export const browserFallbackLocale: Locale = sourceLocale

export const languageNames: { [locale in Locale]: string } = {
  vi: 'Tiếng Việt',
  en: 'English',
}
