import { create } from 'zustand'

/**
 * Categories of cross-module alerts surfaced on the MIS Alerts page and the
 * dashboard's Insights panel. Admins can opt the org out of categories that
 * don't apply (e.g., a paperless shop ignoring SDMS).
 */
export type AlertCategory =
  | 'inventory'
  | 'procurement'
  | 'maintenance'
  | 'fleet'
  | 'assets'
  | 'sdms'

export type DefaultReportRange = '7d' | '30d' | '90d' | 'mtd' | 'qtd' | 'ytd'

export interface MisSettings {
  /** Default date window for Custom Reports' From/To inputs. */
  defaultReportRange: DefaultReportRange
  /** Which alert categories the MIS Alerts page surfaces. Empty = show all. */
  enabledAlertCategories: AlertCategory[]
}

const STORAGE_KEY = 'mis-settings'

const defaults: MisSettings = {
  defaultReportRange: '30d',
  enabledAlertCategories: ['inventory', 'procurement', 'maintenance', 'fleet', 'assets', 'sdms'],
}

function readStored(): MisSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<MisSettings>
    return {
      ...defaults,
      ...parsed,
      enabledAlertCategories: Array.isArray(parsed.enabledAlertCategories)
        ? (parsed.enabledAlertCategories as AlertCategory[])
        : defaults.enabledAlertCategories,
    }
  } catch {
    return defaults
  }
}

function persist(settings: MisSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface MisSettingsStore {
  settings: MisSettings
  update: (patch: Partial<MisSettings>) => void
  toggleCategory: (category: AlertCategory) => void
  reset: () => void
}

export const useMisSettings = create<MisSettingsStore>((set) => ({
  settings: readStored(),
  update: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch }
      persist(next)
      return { settings: next }
    }),
  toggleCategory: (category) =>
    set((s) => {
      const cur = new Set(s.settings.enabledAlertCategories)
      if (cur.has(category)) cur.delete(category)
      else cur.add(category)
      const next: MisSettings = { ...s.settings, enabledAlertCategories: Array.from(cur) }
      persist(next)
      return { settings: next }
    }),
  reset: () => {
    persist(defaults)
    set({ settings: defaults })
  },
}))
