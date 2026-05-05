import { describe, it, expect } from 'vitest'
import { hasModuleAccess } from './access'
import type { User } from '@/features/users/types'

const baseUser: User = {
  id: 'U1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2025-01-01',
  modules: ['mis', 'sdms'],
  moduleAdmins: [],
}

describe('hasModuleAccess', () => {
  it('returns false for null user', () => {
    expect(hasModuleAccess(null, 'mis')).toBe(false)
  })

  it('returns false for undefined user', () => {
    expect(hasModuleAccess(undefined, 'mis')).toBe(false)
  })

  it('returns true when the module is in the user list', () => {
    expect(hasModuleAccess(baseUser, 'mis')).toBe(true)
    expect(hasModuleAccess(baseUser, 'sdms')).toBe(true)
  })

  it('returns false when the module is not in the user list', () => {
    expect(hasModuleAccess(baseUser, 'inventory')).toBe(false)
    expect(hasModuleAccess(baseUser, 'fleet')).toBe(false)
  })

  it('returns false when the user has no modules', () => {
    expect(hasModuleAccess({ ...baseUser, modules: [] }, 'mis')).toBe(false)
  })
})
