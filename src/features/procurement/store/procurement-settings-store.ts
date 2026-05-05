import { create } from 'zustand'

export interface ProcurementSettings {
  defaultCurrency: string
  autoApproveBelow: number
  requireSupplier: boolean
  requireNeededByDate: boolean
  requireRejectionReason: boolean
  notify: {
    approvalNeeded: boolean
    requestApproved: boolean
    requestRejected: boolean
    requestOverdue: boolean
  }
}

const STORAGE_KEY = 'procurement-settings'

const defaults: ProcurementSettings = {
  defaultCurrency: 'USD',
  autoApproveBelow: 0,
  requireSupplier: false,
  requireNeededByDate: true,
  requireRejectionReason: true,
  notify: {
    approvalNeeded: true,
    requestApproved: true,
    requestRejected: true,
    requestOverdue: true,
  },
}

function readStored(): ProcurementSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<ProcurementSettings>
    return {
      ...defaults,
      ...parsed,
      notify: { ...defaults.notify, ...(parsed.notify ?? {}) },
    }
  } catch {
    return defaults
  }
}

function persist(settings: ProcurementSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface ProcurementSettingsStore {
  settings: ProcurementSettings
  update: (patch: Partial<ProcurementSettings>) => void
  updateNotify: (patch: Partial<ProcurementSettings['notify']>) => void
  reset: () => void
}

export const useProcurementSettings = create<ProcurementSettingsStore>((set) => ({
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
