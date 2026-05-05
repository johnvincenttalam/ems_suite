import { describe, it, expect } from 'vitest'
import { deriveDocumentNotifications } from './derive'
import type { AppDocument } from '@/features/documents'

const NOW = new Date('2026-04-30T12:00:00Z')

function doc(partial: Partial<AppDocument>): AppDocument {
  return {
    id: 'DOC-X',
    title: 'X',
    fileName: 'x.pdf',
    fileType: 'pdf',
    fileSizeBytes: 1000,
    status: 'draft',
    version: 1,
    approvers: [],
    signatures: [],
    createdBy: 'U999',
    createdAt: '2026-04-20T08:00:00Z',
    ...partial,
  }
}

describe('deriveDocumentNotifications — sign_required', () => {
  it('emits sign_required when user is the next approver', () => {
    const docs = [doc({
      id: 'DOC-001',
      status: 'in_review',
      approvers: ['U001', 'U002'],
      currentApproverIndex: 1,
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'sign_required' && n.id === 'sign:DOC-001')).toBe(true)
  })

  it('does not emit sign_required for non-next approver', () => {
    const docs = [doc({
      id: 'DOC-001',
      status: 'in_review',
      approvers: ['U001', 'U002'],
      currentApproverIndex: 0,
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'sign_required')).toBe(false)
  })

  it('does not emit sign_required for non-in_review docs', () => {
    const docs = [doc({
      id: 'DOC-001',
      status: 'approved',
      approvers: ['U002'],
      currentApproverIndex: 0,
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'sign_required')).toBe(false)
  })
})

describe('deriveDocumentNotifications — routing_pending', () => {
  it('emits routing_pending for each pending routing where user is recipient', () => {
    const docs = [doc({
      id: 'DOC-002',
      routings: [
        { id: 'R1', routedAt: '2026-04-29T08:00:00Z', senderId: 'U001', recipientId: 'U002', purpose: 'review', status: 'pending' },
        { id: 'R2', routedAt: '2026-04-28T08:00:00Z', senderId: 'U001', recipientId: 'U002', purpose: 'approval', status: 'completed' },
      ],
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW)
    const routes = notifs.filter((n) => n.kind === 'routing_pending')
    expect(routes).toHaveLength(1)
    expect(routes[0].id).toBe('route:DOC-002:R1')
  })

  it('uses warning severity for approval routings, info for others', () => {
    const docs = [doc({
      id: 'DOC-X',
      routings: [
        { id: 'R1', routedAt: '2026-04-29T08:00:00Z', senderId: 'U001', recipientId: 'U002', purpose: 'approval', status: 'pending' },
        { id: 'R2', routedAt: '2026-04-29T08:00:00Z', senderId: 'U001', recipientId: 'U002', purpose: 'review',   status: 'pending' },
      ],
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW).filter((n) => n.kind === 'routing_pending')
    expect(notifs.find((n) => n.id.endsWith('R1'))?.severity).toBe('warning')
    expect(notifs.find((n) => n.id.endsWith('R2'))?.severity).toBe('info')
  })
})

describe('deriveDocumentNotifications — approved/rejected', () => {
  it('emits doc_approved for the author', () => {
    const docs = [doc({
      id: 'DOC-003',
      status: 'approved',
      createdBy: 'U001',
      approvers: ['U002'],
      signatures: [{ signerId: 'U002', signedAt: '2026-04-30T10:00:00Z' }],
    })]
    const notifs = deriveDocumentNotifications(docs, 'U001', NOW)
    expect(notifs.some((n) => n.kind === 'doc_approved' && n.id === 'approved:DOC-003')).toBe(true)
  })

  it('does not emit doc_approved for non-authors', () => {
    const docs = [doc({
      id: 'DOC-003',
      status: 'approved',
      createdBy: 'U001',
      approvers: ['U002'],
      signatures: [{ signerId: 'U002', signedAt: '2026-04-30T10:00:00Z' }],
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'doc_approved')).toBe(false)
  })

  it('emits doc_rejected with the rejection reason in the description', () => {
    const docs = [doc({
      id: 'DOC-004',
      status: 'rejected',
      createdBy: 'U001',
      rejectedBy: 'U002',
      rejectedAt: '2026-04-29T10:00:00Z',
      rejectedReason: 'Needs revision',
    })]
    const notifs = deriveDocumentNotifications(docs, 'U001', NOW)
    const r = notifs.find((n) => n.kind === 'doc_rejected')
    expect(r).toBeTruthy()
    expect(r!.description).toContain('Needs revision')
    expect(r!.severity).toBe('danger')
  })
})

describe('deriveDocumentNotifications — deadlines', () => {
  it('emits deadline_overdue when deadline is past for an approver', () => {
    const docs = [doc({
      id: 'DOC-005',
      status: 'in_review',
      approvers: ['U002'],
      currentApproverIndex: 0,
      deadline: '2026-04-25',
    })]
    const notifs = deriveDocumentNotifications(docs, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'deadline_overdue')).toBe(true)
  })

  it('emits deadline_soon when deadline is within 2 days for the author', () => {
    const docs = [doc({
      id: 'DOC-006',
      status: 'in_review',
      createdBy: 'U001',
      approvers: ['U002'],
      deadline: '2026-05-01',
    })]
    const notifs = deriveDocumentNotifications(docs, 'U001', NOW)
    expect(notifs.some((n) => n.kind === 'deadline_soon')).toBe(true)
  })

  it('does not emit deadline notifications for users unrelated to the doc', () => {
    const docs = [doc({
      id: 'DOC-007',
      status: 'in_review',
      createdBy: 'U001',
      approvers: ['U002'],
      deadline: '2026-04-25',
    })]
    const notifs = deriveDocumentNotifications(docs, 'U003', NOW)
    expect(notifs.some((n) => n.kind === 'deadline_overdue' || n.kind === 'deadline_soon')).toBe(false)
  })

  it('does not emit deadline_soon for non-in-review docs', () => {
    const docs = [doc({
      id: 'DOC-008',
      status: 'approved',
      createdBy: 'U001',
      approvers: ['U002'],
      deadline: '2026-05-01',
    })]
    const notifs = deriveDocumentNotifications(docs, 'U001', NOW)
    expect(notifs.some((n) => n.kind === 'deadline_soon')).toBe(false)
  })
})

describe('deriveDocumentNotifications — output', () => {
  it('sorts newest-first by timestamp', () => {
    const docs = [
      doc({
        id: 'DOC-A',
        status: 'rejected',
        createdBy: 'U001',
        rejectedAt: '2026-04-25T10:00:00Z',
        rejectedReason: 'old',
      }),
      doc({
        id: 'DOC-B',
        status: 'rejected',
        createdBy: 'U001',
        rejectedAt: '2026-04-29T10:00:00Z',
        rejectedReason: 'new',
      }),
    ]
    const notifs = deriveDocumentNotifications(docs, 'U001', NOW)
    expect(notifs[0].id).toBe('rejected:DOC-B')
    expect(notifs[1].id).toBe('rejected:DOC-A')
  })

  it('returns empty for users with no relevant docs', () => {
    const docs = [doc({ status: 'approved', createdBy: 'U001', approvers: ['U002'], signatures: [{ signerId: 'U002', signedAt: '2026-04-30T10:00:00Z' }] })]
    expect(deriveDocumentNotifications(docs, 'U999', NOW)).toEqual([])
  })

  it('produces stable ids so the same trigger keeps its read state', () => {
    const docs = [doc({
      id: 'DOC-001',
      status: 'in_review',
      approvers: ['U002'],
      currentApproverIndex: 0,
    })]
    const a = deriveDocumentNotifications(docs, 'U002', NOW)
    const b = deriveDocumentNotifications(docs, 'U002', NOW)
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id))
  })
})
