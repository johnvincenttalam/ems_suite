import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCompactCurrency, formatNumber } from './format'

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('supports a custom currency', () => {
    expect(formatCurrency(1234.5, 'EUR', 'de-DE')).toMatch(/1\.234,50\s*€/)
  })

  it('always shows 2 decimal places', () => {
    expect(formatCurrency(10)).toBe('$10.00')
  })
})

describe('formatCompactCurrency', () => {
  it('abbreviates millions', () => {
    expect(formatCompactCurrency(2_500_000)).toBe('$2.5M')
  })

  it('abbreviates thousands', () => {
    expect(formatCompactCurrency(12_000)).toBe('$12K')
  })

  it('leaves small numbers alone', () => {
    expect(formatCompactCurrency(42)).toBe('$42')
  })
})

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
})
