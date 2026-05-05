import type { User } from '@/features/users/types'
import { mockUsers } from '@/features/users/data/mock-users'
import type { AuthAdapter } from './auth-adapter'

const STORAGE_KEY = 'mock-auth-user-id'

/**
 * In-memory / localStorage-backed auth for local development.
 *
 * Replace with a real AuthAdapter implementation to connect to your backend.
 * Any email from mockUsers is accepted; any password works.
 */
export const mockAuthAdapter: AuthAdapter = {
  async login(email: string, _password: string): Promise<User | null> {
    const user = mockUsers.find((u) => u.email === email)
    if (user) {
      localStorage.setItem(STORAGE_KEY, user.id)
      return user
    }
    return null
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
  },

  async getCurrentUser(): Promise<User | null> {
    const id = localStorage.getItem(STORAGE_KEY)
    if (!id) return null
    return mockUsers.find((u) => u.id === id) ?? null
  },

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY)
  },
}
