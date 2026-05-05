import { describe, it, expect } from 'vitest'
import { categoriesApi } from './api/categories-api'

describe('categoriesApi.list', () => {
  it('returns categories of both supported types', async () => {
    const result = await categoriesApi.list()
    const types = new Set(result.map((c) => c.type))
    expect(types.has('asset')).toBe(true)
    expect(types.has('inventory')).toBe(true)
  })

  it('exposes itemCount as a non-negative number', async () => {
    const result = await categoriesApi.list()
    expect(result.every((c) => typeof c.itemCount === 'number' && c.itemCount >= 0)).toBe(true)
  })
})
