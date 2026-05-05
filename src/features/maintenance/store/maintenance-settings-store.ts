import { create } from 'zustand'

export interface MaintenanceSettings {
  defaultPriority: 'low' | 'medium' | 'high'
  dueSoonDays: number
  requireChecklistOnComplete: boolean
  requireCompletionNotes: boolean
  notify: {
    woAssigned: boolean
    woDueSoon: boolean
    woOverdue: boolean
  }
}

const STORAGE_KEY = 'maintenance-settings'

const defaults: MaintenanceSettings = {
  defaultPriority: 'medium',
  dueSoonDays: 2,
  requireChecklistOnComplete: false,
  requireCompletionNotes: true,
  notify: {
    woAssigned: true,
    woDueSoon: true,
    woOverdue: true,
  },
}

function readStored(): MaintenanceSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<MaintenanceSettings>
    return {
      ...defaults,
      ...parsed,
      notify: { ...defaults.notify, ...(parsed.notify ?? {}) },
    }
  } catch {
    return defaults
  }
}

function persist(settings: MaintenanceSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface MaintenanceSettingsStore {
  settings: MaintenanceSettings
  update: (patch: Partial<MaintenanceSettings>) => void
  updateNotify: (patch: Partial<MaintenanceSettings['notify']>) => void
  reset: () => void
}

export const useMaintenanceSettings = create<MaintenanceSettingsStore>((set) => ({
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
