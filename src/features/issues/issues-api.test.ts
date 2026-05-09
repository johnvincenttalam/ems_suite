import { describe, it, expect, beforeEach } from 'vitest'
import { issuesApi, IssueValidationError } from './api/issues-api'
import { mockIssues } from './data/mock-issues'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'
import type { IssueTarget } from './types'

const ACTOR = 'U001'
const TEST_TARGET: IssueTarget = { kind: 'vehicle', id: 'V001' }

let originalLength: number

beforeEach(() => {
  // Snapshot the seed length so tests created later can be detected and the
  // shared mockIssues array can be cleaned up between cases. The audit log
  // also gets pruned to keep its assertions stable across tests.
  originalLength = mockIssues.length
})

function dropIssuesCreatedDuringTest() {
  while (mockIssues.length > originalLength) {
    mockIssues.shift()
  }
}

describe('issuesApi.list', () => {
  it('returns all seed issues sorted newest-first by reportedAt', async () => {
    const all = await issuesApi.list()
    expect(all.length).toBeGreaterThan(0)
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].reportedAt >= all[i].reportedAt).toBe(true)
    }
  })

  it('filters by target kind', async () => {
    const vehicleOnly = await issuesApi.list({ targetKind: 'vehicle' })
    expect(vehicleOnly.length).toBeGreaterThan(0)
    expect(vehicleOnly.every((i) => i.target.kind === 'vehicle')).toBe(true)

    const assetOnly = await issuesApi.list({ targetKind: 'asset' })
    expect(assetOnly.every((i) => i.target.kind === 'asset')).toBe(true)
  })

  it('filters by specific target (kind + id)', async () => {
    const v003 = await issuesApi.list({ target: { kind: 'vehicle', id: 'V003' } })
    expect(v003.length).toBeGreaterThan(0)
    expect(v003.every((i) => i.target.kind === 'vehicle' && i.target.id === 'V003')).toBe(true)
  })

  it('filters by status', async () => {
    const open = await issuesApi.list({ status: 'open' })
    expect(open.every((i) => i.status === 'open')).toBe(true)

    const closed = await issuesApi.list({ status: 'closed' })
    expect(closed.every((i) => i.status === 'closed')).toBe(true)
  })

  it('all-open returns open + monitor + in_progress only', async () => {
    const allOpen = await issuesApi.list({ status: 'all-open' })
    expect(allOpen.length).toBeGreaterThan(0)
    expect(allOpen.every((i) => ['open', 'monitor', 'in_progress'].includes(i.status))).toBe(true)
  })

  it('filters by severity', async () => {
    const critical = await issuesApi.list({ severity: 'critical' })
    expect(critical.every((i) => i.severity === 'critical')).toBe(true)
  })
})

describe('issuesApi.create', () => {
  it('rejects empty title', async () => {
    await expect(
      issuesApi.create({
        title: '   ',
        severity: 'minor',
        source: 'manual',
        target: TEST_TARGET,
        reportedByUserId: ACTOR,
      }),
    ).rejects.toThrow(IssueValidationError)
    dropIssuesCreatedDuringTest()
  })

  it('creates an issue with status=open, generated id, and audit entry', async () => {
    const auditBefore = mockAuditLog.length
    const issue = await issuesApi.create({
      title: 'Test issue',
      description: 'detail',
      severity: 'major',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    expect(issue.id).toMatch(/^ISS-\d{4}-\d{4}$/)
    expect(issue.status).toBe('open')
    expect(issue.target).toEqual(TEST_TARGET)
    expect(issue.comments).toEqual([])
    expect(issue.attachmentDocumentIds).toEqual([])
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    expect(mockAuditLog[0].module).toBe('Issues')
    expect(mockAuditLog[0].action).toBe('create')
    expect(mockAuditLog[0].detail).toContain('Test issue')
    dropIssuesCreatedDuringTest()
  })
})

describe('issuesApi.createFromInspection', () => {
  it('creates one issue per failed item, marking source = inspection and back-linking the run', async () => {
    const created = await issuesApi.createFromInspection({
      runId: 'CR-TEST-001',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
      failedItems: [
        { itemKey: 'brakes', label: 'Brakes', severity: 'critical', note: 'Soft pedal' },
        { itemKey: 'tires', label: 'Tires', severity: 'major' },
      ],
    })
    expect(created).toHaveLength(2)
    expect(created[0].source).toBe('inspection')
    expect(created[0].sourceChecklistRunId).toBe('CR-TEST-001')
    expect(created[0].sourceChecklistItemKey).toBe('brakes')
    expect(created[0].severity).toBe('critical')
    expect(created[0].description).toBe('Soft pedal')
    expect(created[1].sourceChecklistItemKey).toBe('tires')
    dropIssuesCreatedDuringTest()
  })

  it('returns empty array when there are no failures', async () => {
    const created = await issuesApi.createFromInspection({
      runId: 'CR-TEST-002',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
      failedItems: [],
    })
    expect(created).toEqual([])
  })

  it('defaults missing severity to "major"', async () => {
    const [issue] = await issuesApi.createFromInspection({
      runId: 'CR-TEST-003',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
      failedItems: [{ itemKey: 'lights', label: 'Lights' }],
    })
    expect(issue.severity).toBe('major')
    dropIssuesCreatedDuringTest()
  })
})

describe('issuesApi.setStatus', () => {
  it('blocks resolving a critical issue without resolution notes', async () => {
    const issue = await issuesApi.create({
      title: 'Critical lockup',
      severity: 'critical',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    await expect(
      issuesApi.setStatus({ id: issue.id, status: 'resolved', actorUserId: ACTOR }),
    ).rejects.toThrow(/Resolution notes are required/i)
    dropIssuesCreatedDuringTest()
  })

  it('allows resolving a critical issue when notes are provided', async () => {
    const issue = await issuesApi.create({
      title: 'Critical lockup',
      severity: 'critical',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    const updated = await issuesApi.setStatus({
      id: issue.id,
      status: 'resolved',
      actorUserId: ACTOR,
      resolutionNotes: 'Replaced master cylinder, bled brakes',
    })
    expect(updated.status).toBe('resolved')
    expect(updated.resolvedByUserId).toBe(ACTOR)
    expect(updated.resolutionNotes).toMatch(/master cylinder/)
    expect(updated.resolvedAt).toBeTruthy()
    dropIssuesCreatedDuringTest()
  })

  it('allows resolving non-critical issues without notes', async () => {
    const issue = await issuesApi.create({
      title: 'Loose mirror',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    const updated = await issuesApi.setStatus({ id: issue.id, status: 'resolved', actorUserId: ACTOR })
    expect(updated.status).toBe('resolved')
    dropIssuesCreatedDuringTest()
  })

  it('refuses to close an issue that is not yet resolved', async () => {
    const issue = await issuesApi.create({
      title: 'Wonky horn',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    await expect(
      issuesApi.setStatus({ id: issue.id, status: 'closed', actorUserId: ACTOR }),
    ).rejects.toThrow(/resolved issues can be closed/i)
    dropIssuesCreatedDuringTest()
  })

  it('allows closed → closed (idempotent) and resolved → closed transitions', async () => {
    const issue = await issuesApi.create({
      title: 'Worn wiper',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    await issuesApi.setStatus({ id: issue.id, status: 'resolved', actorUserId: ACTOR })
    const closed = await issuesApi.setStatus({ id: issue.id, status: 'closed', actorUserId: ACTOR })
    expect(closed.status).toBe('closed')
    const reClosed = await issuesApi.setStatus({ id: issue.id, status: 'closed', actorUserId: ACTOR })
    expect(reClosed.status).toBe('closed')
    dropIssuesCreatedDuringTest()
  })

  it('emits an audit entry on every status change', async () => {
    const issue = await issuesApi.create({
      title: 'Squeaky brake',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    const auditBefore = mockAuditLog.length
    await issuesApi.setStatus({ id: issue.id, status: 'in_progress', actorUserId: ACTOR })
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    expect(mockAuditLog[0].module).toBe('Issues')
    expect(mockAuditLog[0].detail).toContain(issue.id)
    dropIssuesCreatedDuringTest()
  })

  it('throws when setting status on an unknown issue', async () => {
    await expect(
      issuesApi.setStatus({ id: 'ISS-NOPE', status: 'in_progress', actorUserId: ACTOR }),
    ).rejects.toThrow(/not found/)
  })
})

describe('issuesApi.assign', () => {
  it('sets and clears the assignee', async () => {
    const issue = await issuesApi.create({
      title: 'Mirror cracked',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    const assigned = await issuesApi.assign({ id: issue.id, assigneeUserId: 'U006', actorUserId: ACTOR })
    expect(assigned.assignedToUserId).toBe('U006')
    const unassigned = await issuesApi.assign({ id: issue.id, assigneeUserId: null, actorUserId: ACTOR })
    expect(unassigned.assignedToUserId).toBeUndefined()
    dropIssuesCreatedDuringTest()
  })
})

describe('issuesApi.addComment', () => {
  it('rejects empty comment bodies', async () => {
    const issue = await issuesApi.create({
      title: 'Test',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    await expect(
      issuesApi.addComment({ id: issue.id, authorUserId: ACTOR, body: '   ' }),
    ).rejects.toThrow(/Comment body is required/)
    dropIssuesCreatedDuringTest()
  })

  it('appends a comment and bumps updatedAt', async () => {
    const issue = await issuesApi.create({
      title: 'Test',
      severity: 'minor',
      source: 'manual',
      target: TEST_TARGET,
      reportedByUserId: ACTOR,
    })
    const before = issue.updatedAt
    // wait a tick so updatedAt changes — Date.now resolution can collide otherwise
    await new Promise((r) => setTimeout(r, 5))
    const updated = await issuesApi.addComment({
      id: issue.id,
      authorUserId: ACTOR,
      body: 'Looking at it tomorrow',
    })
    expect(updated.comments).toHaveLength(1)
    expect(updated.comments[0].body).toBe('Looking at it tomorrow')
    expect(updated.updatedAt > before).toBe(true)
    dropIssuesCreatedDuringTest()
  })
})

describe('issuesApi.createWorkOrder', () => {
  it('escalates an asset-targeted issue and stamps the workOrderId + transitions to in_progress', async () => {
    const issue = await issuesApi.create({
      title: 'Escalation test (asset)',
      severity: 'major',
      source: 'manual',
      target: { kind: 'asset', id: 'AST-008' },
      reportedByUserId: ACTOR,
    })
    const auditBefore = mockAuditLog.length

    const { issue: updated, workOrder } = await issuesApi.createWorkOrder({
      issueId: issue.id,
      scheduledDate: '2026-06-01',
      assigneeUserId: 'U006',
      actorUserId: ACTOR,
    })
    expect(workOrder.id).toMatch(/^WO-\d{4}-\d{4}$/)
    expect(workOrder.assetId).toBe('AST-008')
    expect(workOrder.sourceIssueId).toBe(issue.id)
    expect(workOrder.priority).toBe('high')
    expect(updated.workOrderId).toBe(workOrder.id)
    expect(updated.status).toBe('in_progress')
    expect(mockAuditLog.length).toBe(auditBefore + 2) // maintenance.create + issues.create-WO
    dropIssuesCreatedDuringTest()
  })

  it('escalates a vehicle-targeted issue via the vehicle.linkedAssetId', async () => {
    const issue = await issuesApi.create({
      title: 'Escalation test (vehicle)',
      severity: 'critical',
      source: 'manual',
      target: { kind: 'vehicle', id: 'V001' }, // V001 → AST-008
      reportedByUserId: ACTOR,
    })
    const { workOrder, issue: updated } = await issuesApi.createWorkOrder({
      issueId: issue.id,
      scheduledDate: '2026-06-01',
      assigneeUserId: 'U006',
      actorUserId: ACTOR,
    })
    expect(workOrder.assetId).toBe('AST-008')
    expect(workOrder.priority).toBe('critical')
    expect(updated.workOrderId).toBe(workOrder.id)
    dropIssuesCreatedDuringTest()
  })

  it('refuses to escalate a vehicle that is not linked to an asset', async () => {
    const issue = await issuesApi.create({
      title: 'Unlinked vehicle escalation',
      severity: 'major',
      source: 'manual',
      target: { kind: 'vehicle', id: 'V003' }, // V003 has no linkedAssetId in seed
      reportedByUserId: ACTOR,
    })
    await expect(
      issuesApi.createWorkOrder({
        issueId: issue.id,
        scheduledDate: '2026-06-01',
        assigneeUserId: 'U006',
        actorUserId: ACTOR,
      }),
    ).rejects.toThrow(/not linked to an asset/i)
    // The issue should NOT have been mutated.
    expect(issue.workOrderId).toBeUndefined()
    expect(issue.status).toBe('open')
    dropIssuesCreatedDuringTest()
  })

  it('refuses to escalate an issue that already has a linked WO', async () => {
    const issue = await issuesApi.create({
      title: 'Double escalation',
      severity: 'major',
      source: 'manual',
      target: { kind: 'asset', id: 'AST-008' },
      reportedByUserId: ACTOR,
    })
    await issuesApi.createWorkOrder({
      issueId: issue.id,
      scheduledDate: '2026-06-01',
      assigneeUserId: 'U006',
      actorUserId: ACTOR,
    })
    await expect(
      issuesApi.createWorkOrder({
        issueId: issue.id,
        scheduledDate: '2026-06-02',
        assigneeUserId: 'U006',
        actorUserId: ACTOR,
      }),
    ).rejects.toThrow(/already linked/i)
    dropIssuesCreatedDuringTest()
  })

  it('refuses to escalate a resolved issue', async () => {
    const issue = await issuesApi.create({
      title: 'Already resolved',
      severity: 'minor',
      source: 'manual',
      target: { kind: 'asset', id: 'AST-008' },
      reportedByUserId: ACTOR,
    })
    await issuesApi.setStatus({ id: issue.id, status: 'resolved', actorUserId: ACTOR })
    await expect(
      issuesApi.createWorkOrder({
        issueId: issue.id,
        scheduledDate: '2026-06-01',
        assigneeUserId: 'U006',
        actorUserId: ACTOR,
      }),
    ).rejects.toThrow(/Cannot escalate a resolved issue/i)
    dropIssuesCreatedDuringTest()
  })

  it('does NOT downgrade an issue that is already in_progress to a different state', async () => {
    const issue = await issuesApi.create({
      title: 'Already in progress',
      severity: 'major',
      source: 'manual',
      target: { kind: 'asset', id: 'AST-008' },
      reportedByUserId: ACTOR,
    })
    await issuesApi.setStatus({ id: issue.id, status: 'in_progress', actorUserId: ACTOR })
    const { issue: updated } = await issuesApi.createWorkOrder({
      issueId: issue.id,
      scheduledDate: '2026-06-01',
      assigneeUserId: 'U006',
      actorUserId: ACTOR,
    })
    expect(updated.status).toBe('in_progress')
    dropIssuesCreatedDuringTest()
  })
})

describe('issuesApi.findByWorkOrderId', () => {
  it('finds the issue linked to a work order, or null when none', async () => {
    const issue = await issuesApi.create({
      title: 'Find-by-WO test',
      severity: 'major',
      source: 'manual',
      target: { kind: 'asset', id: 'AST-008' },
      reportedByUserId: ACTOR,
    })
    const { workOrder } = await issuesApi.createWorkOrder({
      issueId: issue.id,
      scheduledDate: '2026-06-01',
      assigneeUserId: 'U006',
      actorUserId: ACTOR,
    })
    const found = await issuesApi.findByWorkOrderId(workOrder.id)
    expect(found?.id).toBe(issue.id)

    const notFound = await issuesApi.findByWorkOrderId('WO-XXXX-9999')
    expect(notFound).toBeNull()
    dropIssuesCreatedDuringTest()
  })
})

describe('seed data integrity', () => {
  it('every seeded issue has a target that references a known vehicle or asset id namespace', async () => {
    const all = await issuesApi.list()
    for (const i of all) {
      if (i.target.kind === 'vehicle') {
        expect(i.target.id.startsWith('V')).toBe(true)
      } else {
        expect(i.target.id.startsWith('AST-')).toBe(true)
      }
    }
  })

  it('inspection-sourced issues have a sourceChecklistRunId', async () => {
    const all = await issuesApi.list()
    for (const i of all.filter((x) => x.source === 'inspection')) {
      expect(i.sourceChecklistRunId).toBeTruthy()
    }
  })

  it('resolved/closed issues carry resolvedByUserId and resolvedAt', async () => {
    const all = await issuesApi.list()
    for (const i of all.filter((x) => x.status === 'resolved' || x.status === 'closed')) {
      expect(i.resolvedByUserId).toBeTruthy()
      expect(i.resolvedAt).toBeTruthy()
    }
  })
})
