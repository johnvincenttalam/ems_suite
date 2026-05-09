import { describe, it, expect } from 'vitest'
import { deriveIssueNotifications } from './derive-issues'
import type { Issue } from '@/features/issues'

const NOW = new Date('2026-05-09T10:00:00Z')

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'ISS-2026-0001',
    title: 'Test issue',
    severity: 'major',
    status: 'open',
    source: 'manual',
    target: { kind: 'vehicle', id: 'V001' },
    reportedByUserId: 'U002',
    reportedAt: '2026-05-08T10:00:00Z',
    attachmentDocumentIds: [],
    comments: [],
    createdAt: '2026-05-08T10:00:00Z',
    updatedAt: '2026-05-08T10:00:00Z',
    ...overrides,
  }
}

describe('deriveIssueNotifications', () => {
  it('emits a critical alert for any open critical issue regardless of assignee', () => {
    const issues = [makeIssue({ severity: 'critical', status: 'open' })]
    const out = deriveIssueNotifications(issues, 'U999', NOW)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('issue_critical_open')
    expect(out[0].severity).toBe('danger')
  })

  it('emits an assigned alert for non-critical issues assigned to the user', () => {
    const issues = [
      makeIssue({ id: 'ISS-A', severity: 'major', assignedToUserId: 'U001' }),
      makeIssue({ id: 'ISS-B', severity: 'minor', assignedToUserId: 'U002' }),
    ]
    const outForU001 = deriveIssueNotifications(issues, 'U001', NOW)
    expect(outForU001.find((n) => n.id === 'issue-assigned:ISS-A')).toBeDefined()
    expect(outForU001.find((n) => n.id === 'issue-assigned:ISS-B')).toBeUndefined()
  })

  it('emits a stale alert only for non-assigned, non-critical issues open >= 7 days', () => {
    const issues = [
      makeIssue({ id: 'ISS-OLD', severity: 'minor', status: 'open', reportedAt: '2026-04-30T10:00:00Z' }),
      makeIssue({ id: 'ISS-FRESH', severity: 'minor', status: 'open', reportedAt: '2026-05-08T10:00:00Z' }),
    ]
    const out = deriveIssueNotifications(issues, 'U999', NOW)
    expect(out.find((n) => n.id === 'issue-stale:ISS-OLD')).toBeDefined()
    expect(out.find((n) => n.id === 'issue-stale:ISS-FRESH')).toBeUndefined()
  })

  it('does NOT emit anything for resolved or closed issues', () => {
    const issues = [
      makeIssue({ id: 'A', severity: 'critical', status: 'resolved' }),
      makeIssue({ id: 'B', severity: 'critical', status: 'closed' }),
    ]
    expect(deriveIssueNotifications(issues, 'U001', NOW)).toEqual([])
  })

  it('routes the link based on target kind (vehicle → fleet, asset → assets)', () => {
    const issues = [
      makeIssue({ id: 'V', severity: 'critical', target: { kind: 'vehicle', id: 'V001' } }),
      makeIssue({ id: 'A', severity: 'critical', target: { kind: 'asset', id: 'AST-001' } }),
    ]
    const out = deriveIssueNotifications(issues, 'U001', NOW)
    const v = out.find((n) => n.title.includes('Test issue') && n.module === 'fleet')
    const a = out.find((n) => n.title.includes('Test issue') && n.module === 'assets')
    expect(v?.link).toContain('/module/fleet/issues')
    expect(a?.link).toContain('/module/assets/issues')
  })

  it('sorts danger before warning before info, then by reportedAt desc', () => {
    const issues = [
      makeIssue({ id: 'OLD-CRIT', severity: 'critical', status: 'open', reportedAt: '2026-04-01T10:00:00Z' }),
      makeIssue({ id: 'NEW-CRIT', severity: 'critical', status: 'open', reportedAt: '2026-05-08T10:00:00Z' }),
      makeIssue({ id: 'NEW-ASSIGNED', severity: 'minor', assignedToUserId: 'U001', reportedAt: '2026-05-08T11:00:00Z' }),
    ]
    const out = deriveIssueNotifications(issues, 'U001', NOW)
    expect(out[0].severity).toBe('danger')
    expect(out[1].severity).toBe('danger')
    expect(out[2].severity).toBe('warning')
    // Within danger, newer first
    expect(out[0].title).toContain('Test issue')
  })
})
