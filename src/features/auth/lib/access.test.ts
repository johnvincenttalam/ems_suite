import { describe, it, expect } from 'vitest'
import {
  hasModuleAccess,
  isModuleAdmin,
  isModuleManagerOrAbove,
  moduleRoleOf,
  userModules,
} from './access'
import type { User } from '@/features/users/types'

const baseUser: User = {
  id: 'U1',
  name: 'Test User',
  email: 'test@example.com',
  status: 'active',
  createdAt: '2025-01-01',
  moduleRoles: { mis: 'member', sdms: 'admin', procurement: 'manager' },
}

describe('hasModuleAccess', () => {
  it('returns false for null or undefined user', () => {
    expect(hasModuleAccess(null, 'mis')).toBe(false)
    expect(hasModuleAccess(undefined, 'mis')).toBe(false)
  })

  it('returns true when the user has any role in the module', () => {
    expect(hasModuleAccess(baseUser, 'mis')).toBe(true)
    expect(hasModuleAccess(baseUser, 'sdms')).toBe(true)
    expect(hasModuleAccess(baseUser, 'procurement')).toBe(true)
  })

  it('returns false when the module is absent from moduleRoles', () => {
    expect(hasModuleAccess(baseUser, 'inventory')).toBe(false)
    expect(hasModuleAccess(baseUser, 'fleet')).toBe(false)
  })

  it('returns false when moduleRoles is empty', () => {
    expect(hasModuleAccess({ ...baseUser, moduleRoles: {} }, 'mis')).toBe(false)
  })
})

describe('moduleRoleOf', () => {
  it('returns the role when present', () => {
    expect(moduleRoleOf(baseUser, 'sdms')).toBe('admin')
    expect(moduleRoleOf(baseUser, 'procurement')).toBe('manager')
    expect(moduleRoleOf(baseUser, 'mis')).toBe('member')
  })

  it('returns null when the user has no role in the module', () => {
    expect(moduleRoleOf(baseUser, 'fleet')).toBeNull()
    expect(moduleRoleOf(null, 'mis')).toBeNull()
  })
})

describe('isModuleAdmin', () => {
  it('is true only for admins of the module', () => {
    expect(isModuleAdmin(baseUser, 'sdms')).toBe(true)
    expect(isModuleAdmin(baseUser, 'procurement')).toBe(false) // manager
    expect(isModuleAdmin(baseUser, 'mis')).toBe(false) // member
    expect(isModuleAdmin(baseUser, 'fleet')).toBe(false) // no access
  })
})

describe('isModuleManagerOrAbove', () => {
  it('is true for admins and managers, false for members and non-members', () => {
    expect(isModuleManagerOrAbove(baseUser, 'sdms')).toBe(true) // admin
    expect(isModuleManagerOrAbove(baseUser, 'procurement')).toBe(true) // manager
    expect(isModuleManagerOrAbove(baseUser, 'mis')).toBe(false) // member
    expect(isModuleManagerOrAbove(baseUser, 'fleet')).toBe(false) // no access
  })
})

describe('userModules', () => {
  it('returns every module the user has a role in', () => {
    expect(userModules(baseUser).sort()).toEqual(['mis', 'procurement', 'sdms'])
  })

  it('returns an empty array for users with no roles', () => {
    expect(userModules({ ...baseUser, moduleRoles: {} })).toEqual([])
    expect(userModules(null)).toEqual([])
  })
})
