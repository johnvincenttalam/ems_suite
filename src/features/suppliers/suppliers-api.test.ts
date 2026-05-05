import { describe, it, expect } from 'vitest'
import { suppliersApi } from './api/suppliers-api'

describe('suppliersApi.list', () => {
  it('returns at least one supplier', async () => {
    const result = await suppliersApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every supplier has a contact email and phone', async () => {
    const result = await suppliersApi.list()
    expect(result.every((s) => s.email.includes('@') && s.contactNumber.length >= 7)).toBe(true)
  })

  it('every supplier has a valid status', async () => {
    const result = await suppliersApi.list()
    const allowed = new Set(['active', 'inactive'])
    expect(result.every((s) => allowed.has(s.status))).toBe(true)
  })
})
