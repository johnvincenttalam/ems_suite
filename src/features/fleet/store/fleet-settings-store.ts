import { create } from 'zustand'

export interface FleetSettings {
  defaultFuelType: 'petrol' | 'diesel' | 'electric'
  longTripHours: number
  serviceIntervalKm: number
  requireOdometerOnFuel: boolean
  requireOdometerOnTripStart: boolean
  notify: {
    inMaintenance: boolean
    longTrip: boolean
  }
}

const STORAGE_KEY = 'fleet-settings'

const defaults: FleetSettings = {
  defaultFuelType: 'diesel',
  longTripHours: 12,
  serviceIntervalKm: 10000,
  requireOdometerOnFuel: true,
  requireOdometerOnTripStart: true,
  notify: {
    inMaintenance: true,
    longTrip: true,
  },
}

function readStored(): FleetSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<FleetSettings>
    return {
      ...defaults,
      ...parsed,
      notify: { ...defaults.notify, ...(parsed.notify ?? {}) },
    }
  } catch {
    return defaults
  }
}

function persist(settings: FleetSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface FleetSettingsStore {
  settings: FleetSettings
  update: (patch: Partial<FleetSettings>) => void
  updateNotify: (patch: Partial<FleetSettings['notify']>) => void
  reset: () => void
}

export const useFleetSettings = create<FleetSettingsStore>((set) => ({
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
