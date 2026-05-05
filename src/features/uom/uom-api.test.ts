import { describe, it, expect } from 'vitest'
import { uomApi } from './api/uom-api'

describe('uomApi.list', () => {
  it('returns at least one unit of measure', async () => {
    const result = await uomApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every UOM has a non-empty symbol', async () => {
    const result = await uomApi.list()
    expect(result.every((u) => u.symbol.length > 0)).toBe(true)
  })

  it('symbols are unique', async () => {
    const result = await uomApi.list()
    const symbols = result.map((u) => u.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})
