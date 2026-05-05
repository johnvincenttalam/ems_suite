import { create } from 'zustand'

const STORAGE_KEY = 'sdms.notification-read'

function readStored(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function persist(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // localStorage may be full or unavailable (private mode) — read-state is
    // a UX nicety, not load-bearing, so silently degrade.
  }
}

interface NotificationReadState {
  readIds: Set<string>
  isRead: (id: string) => boolean
  markRead: (id: string) => void
  markAllRead: (ids: string[]) => void
  reset: () => void
}

export const useNotificationReadStore = create<NotificationReadState>((set, get) => ({
  readIds: readStored(),

  isRead: (id) => get().readIds.has(id),

  markRead: (id) => {
    const next = new Set(get().readIds)
    next.add(id)
    persist(next)
    set({ readIds: next })
  },

  markAllRead: (ids) => {
    const next = new Set(get().readIds)
    for (const id of ids) next.add(id)
    persist(next)
    set({ readIds: next })
  },

  reset: () => {
    persist(new Set())
    set({ readIds: new Set() })
  },
}))
