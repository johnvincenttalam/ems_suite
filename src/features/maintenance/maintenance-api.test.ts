import { describe, it, expect } from 'vitest'
import { maintenanceApi } from './api/maintenance-api'
import { mockAssets } from '@/features/assets'
import { mockUsers } from '@/features/users'

describe('maintenanceApi.list', () => {
  it('returns work orders sorted by scheduledDate ascending', async () => {
    const result = await maintenanceApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].scheduledDate <= result[i].scheduledDate).toBe(true)
    }
  })

  it('every work order references a known asset', async () => {
    const result = await maintenanceApi.list()
    const assetIds = new Set(mockAssets.map((a) => a.id))
    expect(result.every((w) => assetIds.has(w.assetId))).toBe(true)
  })

  it('every work order is assigned to a known user', async () => {
    const result = await maintenanceApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((w) => userIds.has(w.assignedTo))).toBe(true)
  })

  it('every work order has a valid status and priority', async () => {
    const result = await maintenanceApi.list()
    const statuses = new Set(['pending', 'ongoing', 'completed'])
    const priorities = new Set(['low', 'medium', 'high', 'critical'])
    expect(result.every((w) => statuses.has(w.status))).toBe(true)
    expect(result.every((w) => priorities.has(w.priority))).toBe(true)
  })

  it('completed work orders carry a completedDate', async () => {
    const result = await maintenanceApi.list()
    const completed = result.filter((w) => w.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    expect(completed.every((w) => !!w.completedDate)).toBe(true)
  })

  it('non-completed work orders do not carry a completedDate', async () => {
    const result = await maintenanceApi.list()
    expect(result.filter((w) => w.status !== 'completed').every((w) => !w.completedDate)).toBe(true)
  })

  it('completedDate is on or after scheduledDate where present', async () => {
    const result = await maintenanceApi.list()
    expect(result.filter((w) => !!w.completedDate).every((w) => w.completedDate! >= w.scheduledDate)).toBe(true)
  })
})
