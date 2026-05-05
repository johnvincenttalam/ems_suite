import { localeConfig } from '@/config/locale'

export function formatCurrency(
  amount: number,
  currency: string = localeConfig.currency,
  locale: string = localeConfig.locale,
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompactCurrency(amount: number, currency: string = localeConfig.currency) {
  const symbol = new Intl.NumberFormat(localeConfig.locale, { style: 'currency', currency })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? '$'
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(0)}K`
  return `${symbol}${amount.toLocaleString()}`
}

export function formatNumber(value: number, locale: string = localeConfig.locale) {
  return new Intl.NumberFormat(locale).format(value)
}
