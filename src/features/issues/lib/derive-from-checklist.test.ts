import { describe, it, expect } from 'vitest'
import { deriveIssueInputsFromFailures } from './derive-from-checklist'
import { severityToWorkOrderPriority } from './derive-priority'

describe('deriveIssueInputsFromFailures', () => {
  it('maps required failures to "major" and optional to "minor"', () => {
    const out = deriveIssueInputsFromFailures([
      { itemKey: 'brakes', label: 'Brakes', required: true },
      { itemKey: 'wipers', label: 'Wipers', required: false },
    ])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ itemKey: 'brakes', label: 'Brakes', severity: 'major' })
    expect(out[1]).toMatchObject({ itemKey: 'wipers', label: 'Wipers', severity: 'minor' })
  })

  it('preserves notes verbatim', () => {
    const [out] = deriveIssueInputsFromFailures([
      { itemKey: 'tires', label: 'Tires', required: true, note: 'Front-left worn near tread indicator' },
    ])
    expect(out.note).toBe('Front-left worn near tread indicator')
  })

  it('returns an empty list when no failures are passed', () => {
    expect(deriveIssueInputsFromFailures([])).toEqual([])
  })
})

describe('severityToWorkOrderPriority', () => {
  it('maps the three severities onto WO priorities', () => {
    expect(severityToWorkOrderPriority('minor')).toBe('low')
    expect(severityToWorkOrderPriority('major')).toBe('high')
    expect(severityToWorkOrderPriority('critical')).toBe('critical')
  })
})
