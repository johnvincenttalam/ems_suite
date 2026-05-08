import { create } from 'zustand'

export interface AssetsSettings {
  /** Default depreciation life in months — used when registering an asset
   * with no explicit `usefulLifeMonths`. */
  defaultDepreciationMonths: number
  /** Salvage value as a percentage of purchase cost — used as a placeholder
   * default when registering an asset with no explicit salvage value. */
  defaultSalvagePercent: number
  /** Default location pre-selected on the Add Asset modal. Empty = no default. */
  defaultLocationId: string
  /** Days an open assignment can run before showing as long-overdue. */
  longCheckoutDays: number
  /** Warranty alert threshold — assets within this many days of expiry are flagged. */
  warrantyExpiringDays: number
  /** When true, the Stock In/Out style "negative stock" check applies — for
   * Assets this means transfers and disposals must go through approval. */
  requireApprovalForDisposal: boolean
  requireApprovalForTransfer: boolean
  /** Operational input controls. */
  requireSerialOnCreate: boolean
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
  requireApprovalForDisposal: true,
  requireApprovalForTransfer: false,
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
