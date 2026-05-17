import type { DisplayCurrency } from '@/lib/money'
import { defaultDisplayCurrency, displayCurrencies, formatMoney, getDisplayCurrency } from '@/lib/money'

const displayCurrencyStorageKey = 'ticketrush:display-currency'

export function useCurrencyPreference() {
  const storedCurrency = useLocalStorage<DisplayCurrency>(displayCurrencyStorageKey, defaultDisplayCurrency, {
    serializer: {
      read: value => getDisplayCurrency(value),
      write: value => value,
    },
  })

  const displayCurrency = computed({
    get: () => getDisplayCurrency(storedCurrency.value),
    set: (value: DisplayCurrency) => {
      storedCurrency.value = value
    },
  })

  function setDisplayCurrency(value: DisplayCurrency) {
    displayCurrency.value = value
  }

  function formatPreferredCurrency(
    cents: number,
    sourceCurrency: string,
    locale: string,
    options: Intl.NumberFormatOptions = {},
  ) {
    return formatMoney(cents, sourceCurrency, displayCurrency.value, locale, options)
  }

  return {
    displayCurrencies,
    displayCurrency,
    setDisplayCurrency,
    formatCurrency: formatPreferredCurrency,
  }
}
