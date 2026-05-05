import { env } from '@/shared/env'

export const localeConfig = {
  currency: env.defaultCurrency,
  locale: env.defaultLocale,
  dateFormat: 'MMM d, yyyy',
  dateTimeFormat: 'MMM d, yyyy · h:mm a',
}

export type LocaleConfig = typeof localeConfig
