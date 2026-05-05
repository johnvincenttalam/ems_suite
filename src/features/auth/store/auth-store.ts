import { create } from 'zustand'
import type { User } from '@/features/users/types'
import { authAdapter } from '@/features/auth/adapters'
import type { ModuleKey } from '@/config/modules'

const SELECTED_MODULE_KEY = 'ems-selected-module'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isRestoring: boolean
  selectedModule: ModuleKey | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  restore: () => Promise<void>
  setUser: (user: User) => void
  setSelectedModule: (key: ModuleKey | null) => void
}

function readStoredModule(): ModuleKey | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(SELECTED_MODULE_KEY) as ModuleKey | null) ?? null
}

function writeStoredModule(key: ModuleKey | null) {
  if (typeof window === 'undefined') return
  if (key) localStorage.setItem(SELECTED_MODULE_KEY, key)
  else localStorage.removeItem(SELECTED_MODULE_KEY)
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isRestoring: true,
  selectedModule: readStoredModule(),

  login: async (email, password) => {
    const user = await authAdapter.login(email, password)
    if (user) {
      set({ user, isAuthenticated: true })
      return true
    }
    return false
  },

  logout: async () => {
    await authAdapter.logout()
    writeStoredModule(null)
    set({ user: null, isAuthenticated: false, selectedModule: null })
  },

  restore: async () => {
    const user = await authAdapter.getCurrentUser()
    set({ user, isAuthenticated: !!user, isRestoring: false })
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true })
  },

  setSelectedModule: (key) => {
    writeStoredModule(key)
    set({ selectedModule: key })
  },
}))

if (typeof window !== 'undefined') {
  useAuthStore.getState().restore()
}
