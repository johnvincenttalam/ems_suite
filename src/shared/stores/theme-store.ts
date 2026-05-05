import { create } from 'zustand'
import { ACCENTS, type Accent } from '@/config/theme'
import { env } from '@/shared/env'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  accent: Accent
  toggle: () => void
  setTheme: (theme: Theme) => void
  setAccent: (accent: Accent) => void
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const v = localStorage.getItem('theme')
  return v === 'dark' ? 'dark' : 'light'
}

function readStoredAccent(): Accent {
  if (typeof window === 'undefined') return env.defaultAccent
  const v = localStorage.getItem('accent') as Accent | null
  return v && ACCENTS.includes(v) ? v : env.defaultAccent
}

function applyAccent(accent: Accent) {
  if (typeof document === 'undefined') return
  ACCENTS.forEach((a) => document.documentElement.classList.toggle(`accent-${a}`, a === accent))
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

const initialTheme = readStoredTheme()
const initialAccent = readStoredAccent()
applyTheme(initialTheme)
applyAccent(initialAccent)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  accent: initialAccent,

  toggle: () =>
    set((s) => {
      const next: Theme = s.theme === 'light' ? 'dark' : 'light'
      applyTheme(next)
      localStorage.setItem('theme', next)
      return { theme: next }
    }),

  setTheme: (theme) => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
    set({ theme })
  },

  setAccent: (accent) => {
    applyAccent(accent)
    localStorage.setItem('accent', accent)
    set({ accent })
  },
}))
