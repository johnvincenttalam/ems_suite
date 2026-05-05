import { describe, it, expect } from 'vitest'
import { departmentsApi } from './api/departments-api'
import { mockDepartments } from './data/mock-departments'

describe('departmentsApi.list', () => {
  it('returns the seeded departments', async () => {
    const result = await departmentsApi.list()
    expect(result).toEqual(mockDepartments)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every department has a unique code', async () => {
    const result = await departmentsApi.list()
    const codes = result.map((d) => d.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
