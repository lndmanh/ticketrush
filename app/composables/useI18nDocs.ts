import type { ContentNavigationItem } from '@nuxt/content'
import { usePageData } from '@/composables/usePageData'

export function useI18nDocs() {
  const { locale, defaultLocale, availableLocales } = useI18n()
  const i18nEnabled = availableLocales.length > 1

  const { navigation } = usePageData()

  const otherLocales = availableLocales.filter(l => l !== defaultLocale)

  const isLocaleSpecificPath = (path: string, localeCode: string): boolean => {
    return path === `/${localeCode}` || path.startsWith(`/${localeCode}/`)
  }

  const localizedNavigation = computed(() => {
    if (!i18nEnabled)
      return navigation.value

    const filteredNav = navigation.value?.filter((nav) => {
      if (locale.value === defaultLocale) {
        return !otherLocales.some(l => isLocaleSpecificPath(nav.path, l))
      }
      return isLocaleSpecificPath(nav.path, locale.value)
    })

    return locale.value === defaultLocale ? filteredNav : (filteredNav?.[0]?.children as ContentNavigationItem[])
  })

  return {
    i18nEnabled,
    navigation: localizedNavigation,
  }
}
