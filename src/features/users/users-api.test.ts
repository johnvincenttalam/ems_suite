import { describe, it, expect } from 'vitest'
import { usersApi } from './api/users-api'

/**
 * Authorization tests for usersApi. The mock layer is the boundary where
 * privilege-escalation gaps would show up if the UI's role gates were
 * bypassed, so these assertions exercise the throw paths directly.
 *
 * Reference IDs from mock-users:
 *  U001 — admin of every module
 *  U002 — maintenance/fleet admin; inventory/assets manager; mis/sdms member
 *  U003 — member of every module
 *  U004 — sdms admin, mis manager
 *  U006 — maintenance MANAGER (not admin)
 */

describe('usersApi.setModuleRole — authorization', () => {
  it('refuses callers who are not admin of the target module', async () => {
    await expect(
      usersApi.setModuleRole({
        userId: 'U003',
        moduleKey: 'sdms',
        role: 'admin',
        auditModule: 'Documents',
        byId: 'U002', // sdms: member
      }),
    ).rejects.toThrow(/admin of sdms/i)
  })

  it('refuses managers — admin is required, not just manager+', async () => {
    await expect(
      usersApi.setModuleRole({
        userId: 'U003',
        moduleKey: 'maintenance',
        role: 'admin',
        auditModule: 'Maintenance',
        byId: 'U006', // maintenance: manager
      }),
    ).rejects.toThrow(/admin of maintenance/i)
  })

  it('refuses unknown callers', async () => {
    await expect(
      usersApi.setModuleRole({
        userId: 'U003',
        moduleKey: 'sdms',
        role: 'manager',
        auditModule: 'Documents',
        byId: 'U999',
      }),
    ).rejects.toThrow(/U999 not found/)
  })

  it('accepts admins of the target module', async () => {
    const result = await usersApi.setModuleRole({
      userId: 'U003',
      moduleKey: 'sdms',
      role: 'manager',
      auditModule: 'Documents',
      byId: 'U004', // sdms: admin
    })
    expect(result.moduleRoles.sdms).toBe('manager')
    // Restore — mockUsers is a module-level singleton.
    await usersApi.setModuleRole({
      userId: 'U003',
      moduleKey: 'sdms',
      role: 'member',
      auditModule: 'Documents',
      byId: 'U001',
    })
  })
})

describe('usersApi.update — moduleRoles diff authorization', () => {
  it('refuses changing a module the caller does not admin', async () => {
    const target = 'U003'
    const existing = (await usersApi.list()).find((u) => u.id === target)!
    const nextRoles = { ...existing.moduleRoles, fleet: 'admin' as const }
    await expect(
      usersApi.update(target, {
        moduleRoles: nextRoles,
        updatedBy: 'U004', // sdms admin, but NOT fleet admin
      }),
    ).rejects.toThrow(/admin of fleet/i)
  })

  it('accepts when the only delta is in a module the caller admins', async () => {
    const target = 'U003'
    const existing = (await usersApi.list()).find((u) => u.id === target)!
    const nextRoles = { ...existing.moduleRoles, sdms: 'manager' as const }
    const result = await usersApi.update(target, {
      moduleRoles: nextRoles,
      updatedBy: 'U004', // sdms admin
    })
    expect(result.moduleRoles.sdms).toBe('manager')
    await usersApi.update(target, {
      moduleRoles: existing.moduleRoles,
      updatedBy: 'U001',
    })
  })

  it('accepts when moduleRoles is sent unchanged — full-map passthrough is fine', async () => {
    const target = 'U003'
    const existing = (await usersApi.list()).find((u) => u.id === target)!
    const result = await usersApi.update(target, {
      moduleRoles: existing.moduleRoles,
      updatedBy: 'U004', // doesn't admin most of these modules, but nothing's changing
    })
    expect(result.moduleRoles).toEqual(existing.moduleRoles)
  })
})

describe('usersApi.inviteToModule — authorization', () => {
  it('refuses callers who are not admin of the target module', async () => {
    await expect(
      usersApi.inviteToModule({
        name: 'New Hire',
        email: 'newhire@example.com',
        moduleKey: 'procurement',
        role: 'member',
        auditModule: 'Procurement',
        invitedBy: 'U006', // procurement: member
      }),
    ).rejects.toThrow(/admin of procurement/i)
  })
})

describe('usersApi.remove — self-delete guard', () => {
  it('refuses self-delete based on ID (not display name)', async () => {
    await expect(usersApi.remove('U001', 'U001')).rejects.toThrow(/cannot delete your own account/i)
  })
})
