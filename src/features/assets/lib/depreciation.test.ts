import { describe, it, expect } from 'vitest'
import { depreciationSummary, totalBookValue } from './depreciation'
import type { Asset } from '@/features/assets/types'

const baseAsset: Asset = {
  id: 'AST-Z',
  assetCode: 'TEST-Z',
  name: 'Test',
  serialNumber: 'SN-Z',
  categoryId: 'C001',
  locationId: 'W001',
  status: 'active',
  condition: 'good',
  purchaseDate: '2025-01-01',
  purchaseCost: 1200,
  usefulLifeMonths: 12,
  salvageValue: 0,
  createdAt: '2025-01-01',
}

describe('depreciationSummary', () => {
  it('returns an empty schedule when purchaseCost is missing', () => {
    const a = { ...baseAsset, purchaseCost: undefined }
    const s = depreciationSummary(a, new Date('2025-12-01'))
    expect(s.schedulable).toBe(false)
    expect(s.bookValue).toBe(0)
    expect(s.monthlyDepreciation).toBe(0)
  })

  it('returns an empty schedule when usefulLifeMonths is 0', () => {
    const a = { ...baseAsset, usefulLifeMonths: 0 }
    const s = depreciationSummary(a, new Date('2025-12-01'))
    expect(s.schedulable).toBe(false)
  })

  it('computes straight-line monthly depreciation correctly', () => {
    // 1200 over 12 months → 100/month
    const s = depreciationSummary(baseAsset, new Date('2025-01-01'))
    expect(s.monthlyDepreciation).toBe(100)
    expect(s.monthsElapsed).toBe(0)
    expect(s.bookValue).toBe(1200)
  })

  it('reduces book value linearly with elapsed months', () => {
    // 6 months elapsed → 600 depreciated → book = 600
    const s = depreciationSummary(baseAsset, new Date('2025-07-01'))
    expect(s.monthsElapsed).toBe(6)
    expect(s.depreciationToDate).toBe(600)
    expect(s.bookValue).toBe(600)
  })

  it('clamps book value at salvageValue once fully depreciated', () => {
    const a = { ...baseAsset, salvageValue: 200 }
    // 24 months in, but useful life is 12 → capped
    const s = depreciationSummary(a, new Date('2027-01-01'))
    expect(s.fullyDepreciated).toBe(true)
    expect(s.bookValue).toBe(200)
  })

  it('treats salvageValue larger than cost as cost (cannot have negative depreciable base)', () => {
    const a = { ...baseAsset, purchaseCost: 100, salvageValue: 500 }
    const s = depreciationSummary(a, new Date('2026-01-01'))
    expect(s.depreciationToDate).toBe(0)
    expect(s.bookValue).toBe(100)
  })

  it('does not depreciate before the purchase date', () => {
    const s = depreciationSummary(baseAsset, new Date('2024-12-01'))
    expect(s.monthsElapsed).toBe(0)
    expect(s.depreciationToDate).toBe(0)
    expect(s.bookValue).toBe(1200)
  })
})

describe('totalBookValue', () => {
  it('sums book values across active assets', () => {
    const a1 = { ...baseAsset, id: 'A1' }
    const a2 = { ...baseAsset, id: 'A2', purchaseCost: 600, usefulLifeMonths: 6 }
    // a1: 12 months @ 100, halfway = 600 book
    // a2: 6 months @ 100, fully depreciated → salvage 0
    const total = totalBookValue([a1, a2], new Date('2025-07-01'))
    expect(total).toBe(600 + 0)
  })

  it('excludes disposed assets by default', () => {
    const live = { ...baseAsset, id: 'A1' }
    const dead = { ...baseAsset, id: 'A2', status: 'disposed' as const }
    const total = totalBookValue([live, dead], new Date('2025-07-01'))
    expect(total).toBe(600)
  })

  it('falls back to purchaseCost when useful life is missing', () => {
    const a = { ...baseAsset, id: 'A1', usefulLifeMonths: undefined }
    const total = totalBookValue([a], new Date('2025-07-01'))
    expect(total).toBe(1200)
  })
})
