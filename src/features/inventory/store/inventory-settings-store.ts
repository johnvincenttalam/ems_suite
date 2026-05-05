import { create } from 'zustand'

export interface InventorySettings {
  defaultReorderLevel: number
  lowStockRatio: number
  requireReasonOnAdjustment: boolean
  requireWarehouseOnTransfer: boolean
  notify: {
    lowStock: boolean
    stockOut: boolean
  }
}

const STORAGE_KEY = 'inventory-settings'

const defaults: InventorySettings = {
  defaultReorderLevel: 10,
  lowStockRatio: 0.5,
  requireReasonOnAdjustment: true,
  requireWarehouseOnTransfer: true,
  notify: {
    lowStock: true,
    stockOut: true,
  },
}

function readStored(): InventorySettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<InventorySettings>
    return {
      ...defaults,
      ...parsed,
      notify: { ...defaults.notify, ...(parsed.notify ?? {}) },
    }
  } catch {
    return defaults
  }
}

function persist(settings: InventorySettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface InventorySettingsStore {
  settings: InventorySettings
  update: (patch: Partial<InventorySettings>) => void
  updateNotify: (patch: Partial<InventorySettings['notify']>) => void
  reset: () => void
}

export const useInventorySettings = create<InventorySettingsStore>((set) => ({
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
