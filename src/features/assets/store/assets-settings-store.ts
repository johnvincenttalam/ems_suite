import { create } from 'zustand'

export interface AssetsSettings {
  defaultDepreciationYears: number
  longCheckoutDays: number
  requireSerialOnCreate: boolean
  requireReturnNotes: boolean
  notify: {
    inMaintenance: boolean
    longCheckout: boolean
  }
}

const STORAGE_KEY = 'assets-settings'

const defaults: AssetsSettings = {
  defaultDepreciationYears: 5,
  longCheckoutDays: 30,
  requireSerialOnCreate: true,
  requireReturnNotes: false,
  notify: {
    inMaintenance: true,
    longCheckout: true,
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
