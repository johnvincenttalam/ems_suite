import { create } from 'zustand'

export interface SdmsSettings {
  trackingPrefix: string
  defaultDeadlineDays: number
  requireClassification: boolean
  defaultRetentionMonths: number
  allowSignatureRevocation: boolean
  requireRejectionReason: boolean
  notify: {
    approvalNeeded: boolean
    routingPending: boolean
    docApproved: boolean
    docRejected: boolean
    deadlineSoon: boolean
    deadlineOverdue: boolean
  }
}

const STORAGE_KEY = 'sdms-settings'

const defaults: SdmsSettings = {
  trackingPrefix: 'SDMS',
  defaultDeadlineDays: 7,
  requireClassification: true,
  defaultRetentionMonths: 60,
  allowSignatureRevocation: true,
  requireRejectionReason: true,
  notify: {
    approvalNeeded: true,
    routingPending: true,
    docApproved: true,
    docRejected: true,
    deadlineSoon: true,
    deadlineOverdue: true,
  },
}

function readStored(): SdmsSettings {
  if (typeof window === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<SdmsSettings>
    return {
      ...defaults,
      ...parsed,
      notify: { ...defaults.notify, ...(parsed.notify ?? {}) },
    }
  } catch {
    return defaults
  }
}

function persist(settings: SdmsSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

interface SdmsSettingsStore {
  settings: SdmsSettings
  update: (patch: Partial<SdmsSettings>) => void
  updateNotify: (patch: Partial<SdmsSettings['notify']>) => void
  reset: () => void
}

export const useSdmsSettings = create<SdmsSettingsStore>((set) => ({
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
