import { describe, it, expect } from 'vitest'
import { sumBy, countBy, topN, monthKey, monthLabel, groupByMonth, weekKey, groupByWeek, pct } from './aggregate'

describe('sumBy', () => {
  it('sums numeric values', () => {
    expect(sumBy([{ x: 1 }, { x: 2 }, { x: 3 }], (i) => i.x)).toBe(6)
  })

  it('returns 0 for an empty array', () => {
    expect(sumBy<{ x: number }>([], (i) => i.x)).toBe(0)
  })
})

describe('countBy', () => {
  it('counts occurrences by key', () => {
    expect(countBy(['a', 'b', 'a', 'c', 'b', 'a'], (s) => s)).toEqual({ a: 3, b: 2, c: 1 })
  })

  it('returns an empty object for an empty array', () => {
    expect(countBy<string>([], (s) => s)).toEqual({})
  })
})

describe('topN', () => {
  it('returns the first n items per the sorter', () => {
    const xs = [{ v: 5 }, { v: 1 }, { v: 9 }, { v: 3 }]
    const top2 = topN(xs, 2, (a, b) => b.v - a.v)
    expect(top2.map((x) => x.v)).toEqual([9, 5])
  })

  it('does not mutate the input', () => {
    const xs = [3, 1, 2]
    topN(xs, 2, (a, b) => a - b)
    expect(xs).toEqual([3, 1, 2])
  })
})

describe('monthKey / monthLabel', () => {
  it('extracts YYYY-MM from an ISO date', () => {
    expect(monthKey('2026-04-27T08:00:00Z')).toBe('2026-04')
    expect(monthKey('2026-04-27')).toBe('2026-04')
  })

  it('formats a month key into a short label', () => {
    expect(monthLabel('2026-04')).toBe('Apr 26')
    expect(monthLabel('2025-12')).toBe('Dec 25')
  })
})

describe('groupByMonth', () => {
  it('groups items by their month and sorts ascending', () => {
    const items = [
      { d: '2026-04-12' },
      { d: '2026-03-04' },
      { d: '2026-04-22' },
      { d: '2025-12-31' },
    ]
    const grouped = groupByMonth(items, (i) => i.d)
    expect(grouped.map((g) => g.key)).toEqual(['2025-12', '2026-03', '2026-04'])
    expect(grouped.find((g) => g.key === '2026-04')!.items).toHaveLength(2)
  })

  it('returns an empty array for empty input', () => {
    expect(groupByMonth<{ d: string }>([], (i) => i.d)).toEqual([])
  })
})

describe('weekKey / groupByWeek', () => {
  it('produces a YYYY-Www key', () => {
    expect(weekKey('2026-04-27')).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('groups items into the same bucket within the same ISO week', () => {
    const items = [
      { d: '2026-04-20' }, // Mon
      { d: '2026-04-22' }, // Wed
      { d: '2026-04-26' }, // Sun
      { d: '2026-04-27' }, // Mon (next ISO week)
    ]
    const grouped = groupByWeek(items, (i) => i.d)
    const keyOf = (iso: string) => weekKey(iso)
    expect(grouped.find((g) => g.key === keyOf('2026-04-22'))!.items.length).toBe(3)
    expect(grouped.find((g) => g.key === keyOf('2026-04-27'))!.items.length).toBe(1)
  })
})

describe('pct', () => {
  it('returns rounded percentage', () => {
    expect(pct(1, 4)).toBe(25)
    expect(pct(2, 3)).toBe(67)
  })

  it('returns 0 when whole is 0', () => {
    expect(pct(5, 0)).toBe(0)
  })
})
