import { create } from 'zustand'

export interface AssetsSettings {
  /** Default depreciation life in months — used when registering an asset
   * with no explicit `usefulLifeMonths`. */
  defaultDepreciationMonths: number
  /** Salvage value as a percentage of purchase cost — auto-fills the salvage
   * field on the Add Asset form when a cost is entered and salvage is empty. */
  defaultSalvagePercent: number
  /** Default location pre-selected on the Add Asset modal. Empty = no default. */
  defaultLocationId: string
  /** Days an open assignment can run before being flagged as long-overdue
   * on the dashboard checkouts widget. */
  longCheckoutDays: number
  /** Warranty alert threshold — assets within this many days of expiry are
   * flagged on the alerts page. */
  warrantyExpiringDays: number
  /** When true, the Add Asset form requires a serial number; otherwise it's
   * optional (useful for batch consumables). */
  requireSerialOnCreate: boolean
  /** When true, the Return modal requires the operator to enter handover
   * notes (condition, location, observations). */
  requireReturnNotes: boolean
  notify: {
    inMaintenance: boolean
    longCheckout: boolean
    warrantyExpiring: boolean
    inspectionFailed: boolean
  }
}

const STORAGE_KEY = 'assets-settings'

const defaults: AssetsSettings = {
  defaultDepreciationMonths: 60,
  defaultSalvagePercent: 10,
  defaultLocationId: '',
  longCheckoutDays: 30,
  warrantyExpiringDays: 60,
  requireSerialOnCreate: true,
  requireReturnNotes: false,
  notify: {
    inMaintenance: true,
    longCheckout: true,
    warrantyExpiring: true,
    inspectionFailed: true,
  },
}

function readStored(): AssetsSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<AssetsSettings>
    return {
      ...defaults,
      ...parsed,
      notify: { ...defaults.notify, ...(parsed.notify ?? {}) },
    }
  } catch {
    return defaults
  }
}

function persist(settings: AssetsSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface AssetsSettingsStore {
  settings: AssetsSettings
  update: (patch: Partial<AssetsSettings>) => void
  updateNotify: (patch: Partial<AssetsSettings['notify']>) => void
  reset: () => void
}

export const useAssetsSettings = create<AssetsSettingsStore>((set) => ({
  settings: readStored(),
  update: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch }
      persist(next)
      return { settings: next }
    }),
  updateNotify: (patch) =>
    set((s) => {
      const next = { ...s.settings, notify: { ...s.settings.notify, ...patch } }
      persist(next)
      return { settings: next }
    }),
  reset: () => {
    persist(defaults)
    set({ settings: defaults })
  },
}))
