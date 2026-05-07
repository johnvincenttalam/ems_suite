import { create } from 'zustand'

export interface InventorySettings {
  defaultReorderLevel: number
  /** Stock at or below this percent of reorder level is "low" (warning). */
  reorderWarningPercent: number
  /** Stock at or below this percent of reorder level is "critical". */
  criticalPercent: number
  requireReasonOnAdjustment: boolean
  requireWarehouseOnTransfer: boolean
  /** Stock In/Out forms refuse to submit without a batch number. */
  requireBatchNumber: boolean
  /** Allow stock-out movements to push item.quantity below zero. */
  allowNegativeStock: boolean
  /** Auto-fill a reference number on stock in/out if the user leaves it empty. */
  autoGenerateReferenceNumber: boolean
  /** UI placeholder — toggles a (future) barcode-scan input on the items page. */
  enableBarcodeScanning: boolean
  defaultWarehouseId: string
  defaultUomId: string
  defaultCurrency: string
  notify: {
    lowStock: boolean
    stockOut: boolean
  }
}

const STORAGE_KEY = 'inventory-settings'

const defaults: InventorySettings = {
  defaultReorderLevel: 10,
  reorderWarningPercent: 80,
  criticalPercent: 50,
  requireReasonOnAdjustment: true,
  requireWarehouseOnTransfer: true,
  requireBatchNumber: false,
  allowNegativeStock: false,
  autoGenerateReferenceNumber: true,
  enableBarcodeScanning: false,
  defaultWarehouseId: '',
  defaultUomId: '',
  defaultCurrency: 'PHP',
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
