type Accent = 'zinc' | 'indigo' | 'emerald' | 'rose'

function parseAccent(value: string | undefined): Accent {
  if (value === 'indigo' || value === 'emerald' || value === 'rose' || value === 'zinc') {
    return value
  }
  return 'zinc'
}

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Enterprise Management System Suite',
  appShortName: import.meta.env.VITE_APP_SHORT_NAME ?? 'EMS Suite',
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  defaultAccent: parseAccent(import.meta.env.VITE_DEFAULT_ACCENT),
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY ?? 'USD',
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? 'en-US',
}

export type AppEnv = typeof env
