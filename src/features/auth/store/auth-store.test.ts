import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth-store'
import { mockUsers } from '@/features/users/data/mock-users'

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset to logged-out state
    useAuthStore.setState({ user: null, isAuthenticated: false, isRestoring: false })
  })

  it('rejects an unknown email', async () => {
    const success = await useAuthStore.getState().login('nobody@example.com', 'whatever')
    expect(success).toBe(false)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('accepts a known email and sets the user', async () => {
    const admin = mockUsers[0]
    const success = await useAuthStore.getState().login(admin.email, 'anything')
    expect(success).toBe(true)
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe(admin.email)
  })

  it('clears state on logout', async () => {
    await useAuthStore.getState().login(mockUsers[0].email, 'x')
    await useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('restores the user from a persisted session', async () => {
    await useAuthStore.getState().login(mockUsers[0].email, 'x')
    // Simulate page refresh — clear in-memory state, keep localStorage
    useAuthStore.setState({ user: null, isAuthenticated: false, isRestoring: true })
    await useAuthStore.getState().restore()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe(mockUsers[0].email)
    expect(state.isRestoring).toBe(false)
  })
})
