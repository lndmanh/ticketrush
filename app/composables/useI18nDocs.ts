export function useI18nDocs() {
  const { availableLocales } = useI18n()
  const i18nEnabled = availableLocales.length > 1

  return {
    i18nEnabled,
  }
}
