import { describe, it, expect } from 'vitest'
import { warehousesApi } from './api/warehouses-api'
import { mockWarehouses } from './data/mock-warehouses'

describe('warehousesApi.list', () => {
  it('returns the seeded warehouses', async () => {
    const result = await warehousesApi.list()
    expect(result).toEqual(mockWarehouses)
  })

  it('only contains valid warehouse types', async () => {
    const result = await warehousesApi.list()
    const allowed = new Set(['warehouse', 'office', 'site'])
    expect(result.every((w) => allowed.has(w.type))).toBe(true)
  })
})
