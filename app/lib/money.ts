export type DisplayCurrency = 'USD' | 'VND'

export const displayCurrencies: DisplayCurrency[] = ['USD', 'VND']
export const defaultDisplayCurrency: DisplayCurrency = 'VND'

const vndPerCurrency: Record<DisplayCurrency, number> = {
  USD: 26355,
  VND: 1,
}

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return displayCurrencies.some(currency => currency === value)
}

export function getDisplayCurrency(value: string | null | undefined): DisplayCurrency {
  return value && isDisplayCurrency(value) ? value : defaultDisplayCurrency
}

export function convertMoneyCents(
  cents: number,
  sourceCurrency: string,
  targetCurrency: DisplayCurrency,
): number {
  const source = getDisplayCurrency(sourceCurrency)
  const sourceAmount = cents / 100
  const amountInVnd = sourceAmount * vndPerCurrency[source]

  return amountInVnd / vndPerCurrency[targetCurrency]
}

export function formatMoney(
  cents: number,
  sourceCurrency: string,
  targetCurrency: DisplayCurrency,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency,
    maximumFractionDigits: targetCurrency === 'VND' ? 0 : 2,
    ...options,
  }).format(convertMoneyCents(cents, sourceCurrency, targetCurrency))

  return formatVietnameseCompactCurrencyUnit(formatted, targetCurrency, locale, options)
}

function formatVietnameseCompactCurrencyUnit(
  value: string,
  currency: DisplayCurrency,
  locale: string,
  options: Intl.NumberFormatOptions,
): string {
  if (currency !== 'VND' || options.notation !== 'compact' || !locale.toLowerCase().startsWith('vi')) {
    return value
  }

  return value
    .replace(/\bTr\b/u, 'triệu')
    .replace(/\bT\b/u, 'tỉ')
}
