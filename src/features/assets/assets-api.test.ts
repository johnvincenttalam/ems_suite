import { describe, it, expect } from 'vitest'
import { assetsApi } from './api/assets-api'
import { mockCategories } from '@/features/categories'
import { mockWarehouses } from '@/features/warehouses'
import { mockUsers } from '@/features/users'

describe('assetsApi.list', () => {
  it('returns at least one asset', async () => {
    const result = await assetsApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every asset only references asset-type categories', async () => {
    const result = await assetsApi.list()
    const assetCatIds = new Set(mockCategories.filter((c) => c.type === 'asset').map((c) => c.id))
    expect(result.every((a) => assetCatIds.has(a.categoryId))).toBe(true)
  })

  it('every asset references a valid location', async () => {
    const result = await assetsApi.list()
    const locIds = new Set(mockWarehouses.map((w) => w.id))
    expect(result.every((a) => locIds.has(a.locationId))).toBe(true)
  })

  it('serial numbers are unique', async () => {
    const result = await assetsApi.list()
    const serials = result.map((a) => a.serialNumber)
    expect(new Set(serials).size).toBe(serials.length)
  })

  it('every assignedTo references a known user', async () => {
    const result = await assetsApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((a) => !a.assignedTo || userIds.has(a.assignedTo))).toBe(true)
  })

  it('disposed assets do not retain an assignment', async () => {
    const result = await assetsApi.list()
    expect(result.filter((a) => a.status === 'disposed').every((a) => !a.assignedTo)).toBe(true)
  })
})

describe('assetsApi.listAssignments', () => {
  it('returns assignments newest-first', async () => {
    const result = await assetsApi.listAssignments()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].assignedDate >= result[i].assignedDate).toBe(true)
    }
  })

  it('returnedDate, when present, is on or after assignedDate', async () => {
    const result = await assetsApi.listAssignments()
    expect(result.every((a) => !a.returnedDate || a.returnedDate >= a.assignedDate)).toBe(true)
  })
})
