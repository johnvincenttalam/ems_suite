import { describe, it, expect } from 'vitest'
import { deriveProcurementNotifications } from './derive-procurement'
import type { RequestWithItems } from '@/features/procurement'

const NOW = new Date('2026-04-30T12:00:00Z')

function req(p: Partial<RequestWithItems>): RequestWithItems {
  return {
    id: 'REQ-X',
    requesterId: 'U999',
    departmentId: 'D001',
    status: 'pending',
    createdAt: '2026-04-25T08:00:00Z',
    items: [],
    totalAmount: 0,
    ...p,
  }
}

describe('deriveProcurementNotifications — approval_needed', () => {
  it('emits when user is the next approver in a pending chain', () => {
    const requests = [req({
      id: 'REQ-1',
      status: 'pending',
      approvers: ['U001', 'U002'],
      currentApproverIndex: 1,
    })]
    const notifs = deriveProcurementNotifications(requests, 'U002', NOW)
    expect(notifs.some((n) => n.id === 'req-approve:REQ-1')).toBe(true)
  })

  it('does not emit for non-next approver', () => {
    const requests = [req({
      id: 'REQ-1',
      status: 'pending',
      approvers: ['U001', 'U002'],
      currentApproverIndex: 0,
    })]
    const notifs = deriveProcurementNotifications(requests, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'approval_needed')).toBe(false)
  })

  it('uses danger severity for urgent priority', () => {
    const requests = [req({
      id: 'REQ-1',
      status: 'pending',
      priority: 'urgent',
      approvers: ['U002'],
      currentApproverIndex: 0,
    })]
    const notifs = deriveProcurementNotifications(requests, 'U002', NOW)
    const n = notifs.find((x) => x.kind === 'approval_needed')
    expect(n?.severity).toBe('danger')
  })
})

describe('deriveProcurementNotifications — approved/rejected', () => {
  it('emits request_approved for the requester when approved', () => {
    const requests = [req({
      id: 'REQ-2',
      status: 'approved',
      requesterId: 'U001',
      approvedAt: '2026-04-29T10:00:00Z',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U001', NOW)
    expect(notifs.some((n) => n.kind === 'request_approved' && n.id === 'req-approved:REQ-2')).toBe(true)
  })

  it('does not emit request_approved for non-requesters', () => {
    const requests = [req({
      id: 'REQ-2',
      status: 'approved',
      requesterId: 'U001',
      approvedAt: '2026-04-29T10:00:00Z',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U999', NOW)
    expect(notifs.some((n) => n.kind === 'request_approved')).toBe(false)
  })

  it('emits request_rejected with the rejection reason', () => {
    const requests = [req({
      id: 'REQ-3',
      status: 'rejected',
      requesterId: 'U001',
      rejectedReason: 'over budget',
      rejectedAt: '2026-04-29T10:00:00Z',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U001', NOW)
    const n = notifs.find((x) => x.kind === 'request_rejected')
    expect(n?.description).toBe('over budget')
    expect(n?.severity).toBe('danger')
  })
})

describe('deriveProcurementNotifications — overdue', () => {
  it('emits request_overdue when neededBy is past for the current approver', () => {
    const requests = [req({
      id: 'REQ-4',
      status: 'pending',
      approvers: ['U002'],
      currentApproverIndex: 0,
      neededBy: '2026-04-25',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'request_overdue')).toBe(true)
  })

  it('emits request_overdue for the requester too', () => {
    const requests = [req({
      id: 'REQ-5',
      status: 'pending',
      requesterId: 'U001',
      approvers: ['U002'],
      currentApproverIndex: 0,
      neededBy: '2026-04-25',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U001', NOW)
    expect(notifs.some((n) => n.kind === 'request_overdue')).toBe(true)
  })

  it('does not emit for unrelated users', () => {
    const requests = [req({
      id: 'REQ-6',
      status: 'pending',
      requesterId: 'U001',
      approvers: ['U002'],
      currentApproverIndex: 0,
      neededBy: '2026-04-25',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U999', NOW)
    expect(notifs.some((n) => n.kind === 'request_overdue')).toBe(false)
  })

  it('does not emit when neededBy is in the future', () => {
    const requests = [req({
      id: 'REQ-7',
      status: 'pending',
      approvers: ['U002'],
      currentApproverIndex: 0,
      neededBy: '2026-05-15',
    })]
    const notifs = deriveProcurementNotifications(requests, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'request_overdue')).toBe(false)
  })
})

describe('deriveProcurementNotifications — output', () => {
  it('produces stable IDs across calls', () => {
    const requests = [req({
      id: 'REQ-8',
      status: 'pending',
      approvers: ['U002'],
      currentApproverIndex: 0,
    })]
    const a = deriveProcurementNotifications(requests, 'U002', NOW)
    const b = deriveProcurementNotifications(requests, 'U002', NOW)
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id))
  })

  it('returns empty for users with no relevant requests', () => {
    const requests = [req({
      id: 'REQ-9',
      status: 'approved',
      requesterId: 'U001',
      approvedAt: '2026-04-29T10:00:00Z',
    })]
    expect(deriveProcurementNotifications(requests, 'U999', NOW)).toEqual([])
  })
})
