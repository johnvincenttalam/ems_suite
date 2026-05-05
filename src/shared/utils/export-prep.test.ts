import { describe, it, expect } from 'vitest'
import { exportFilename, prepareTable } from './export-prep'

describe('prepareTable', () => {
  it('returns header in column order', () => {
    const r = prepareTable([{ a: 1, b: 2 }], [
      { key: 'b', label: 'B' },
      { key: 'a', label: 'A' },
    ])
    expect(r.header).toEqual(['B', 'A'])
  })

  it('renders empty string for null/undefined', () => {
    const r = prepareTable([{ a: null, b: undefined }], [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ])
    expect(r.rows).toEqual([['', '']])
  })

  it('uses the formatter when provided', () => {
    const r = prepareTable([{ amount: 1234 }], [
      { key: 'amount', label: 'Amount', format: (v) => `$${v}` },
    ])
    expect(r.rows).toEqual([['$1234']])
  })

  it('passes the full row to the formatter for cross-field formatting', () => {
    const r = prepareTable([{ first: 'Jane', last: 'Doe' }], [
      { key: 'first', label: 'Name', format: (_v, row) => `${row.first} ${row.last}` },
    ])
    expect(r.rows).toEqual([['Jane Doe']])
  })

  it('serializes Date instances as ISO strings', () => {
    const d = new Date('2026-01-02T03:04:05.000Z')
    const r = prepareTable([{ at: d }], [{ key: 'at', label: 'At' }])
    expect(r.rows).toEqual([['2026-01-02T03:04:05.000Z']])
  })

  it('coerces non-string scalars to string', () => {
    const r = prepareTable([{ n: 42, b: true }], [
      { key: 'n', label: 'N' },
      { key: 'b', label: 'B' },
    ])
    expect(r.rows).toEqual([['42', 'true']])
  })

  it('returns empty rows for empty data', () => {
    const r = prepareTable([], [{ key: 'a', label: 'A' }])
    expect(r.header).toEqual(['A'])
    expect(r.rows).toEqual([])
  })
})

describe('exportFilename', () => {
  it('appends ISO date and extension', () => {
    const f = exportFilename('sdms-report', 'xlsx')
    expect(f).toMatch(/^sdms-report-\d{4}-\d{2}-\d{2}\.xlsx$/)
  })
})
