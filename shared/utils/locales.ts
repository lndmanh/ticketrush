import { defaultLocale, fallbackLocales, locales, sourceLocale } from '../../i18n-constants'

export function normalizeLocale(locale: string) {
  return locales.find(supportedLocale => supportedLocale === locale) ?? defaultLocale
}

export function getLocaleFallbackChain(locale: string) {
  const normalizedLocale = normalizeLocale(locale)
  return [
    normalizedLocale,
    ...fallbackLocales.filter(fallbackLocale => fallbackLocale !== normalizedLocale),
    sourceLocale,
  ].filter((fallbackLocale, index, chain) => chain.indexOf(fallbackLocale) === index)
}

export function getDisplayDateLocale(locale: string) {
  return normalizeLocale(locale) === 'vi' ? 'vi-VN' : 'en-US'
}
