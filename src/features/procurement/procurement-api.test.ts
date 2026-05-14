import { describe, it, expect } from 'vitest'
import { procurementApi } from './api/procurement-api'
import { mockUsers } from '@/features/users'
import { mockDepartments } from '@/features/departments'
import { mockSuppliers } from '@/features/suppliers'
import { mockInventoryItems } from '@/features/inventory'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'

async function chainFixture(approvers: string[] = ['U002', 'U001']) {
  return procurementApi.create({
    requesterId: 'U003',
    departmentId: 'D001',
    approvers,
    items: [{ itemId: 'INV-1001', quantity: 5, unitCost: 4.0 }],
  })
}

describe('procurementApi.list', () => {
  it('returns requests newest-first', async () => {
    const result = await procurementApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].createdAt >= result[i].createdAt).toBe(true)
    }
  })

  it('every request has at least one line item', async () => {
    const result = await procurementApi.list()
    expect(result.every((r) => r.items.length > 0)).toBe(true)
  })

  it('totalAmount equals the sum of (quantity × unitCost) for its line items', async () => {
    const result = await procurementApi.list()
    for (const r of result) {
      const expected = r.items.reduce((s, i) => s + i.quantity * i.unitCost, 0)
      expect(r.totalAmount).toBeCloseTo(expected, 2)
    }
  })

  it('every requesterId references a known user', async () => {
    const result = await procurementApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((r) => userIds.has(r.requesterId))).toBe(true)
  })

  it('every departmentId references a known department', async () => {
    const result = await procurementApi.list()
    const deptIds = new Set(mockDepartments.map((d) => d.id))
    expect(result.every((r) => deptIds.has(r.departmentId))).toBe(true)
  })

  it('every supplierId, when present, references a known supplier', async () => {
    const result = await procurementApi.list()
    const supplierIds = new Set(mockSuppliers.map((s) => s.id))
    expect(result.every((r) => !r.supplierId || supplierIds.has(r.supplierId))).toBe(true)
  })

  it('every line item references a known inventory item', async () => {
    const result = await procurementApi.list()
    const itemIds = new Set(mockInventoryItems.map((i) => i.id))
    const lines = result.flatMap((r) => r.items)
    expect(lines.every((l) => itemIds.has(l.itemId))).toBe(true)
  })

  it('approved requests carry approvedBy and approvedAt', async () => {
    const result = await procurementApi.list()
    const approved = result.filter((r) => r.status === 'approved')
    expect(approved.length).toBeGreaterThan(0)
    expect(approved.every((r) => !!r.approvedBy && !!r.approvedAt)).toBe(true)
  })

  it('rejected requests carry a rejectedReason', async () => {
    const result = await procurementApi.list()
    const rejected = result.filter((r) => r.status === 'rejected')
    expect(rejected.every((r) => !!r.rejectedReason)).toBe(true)
  })
})

describe('procurementApi.create', () => {
  it('appends a new pending request with line items and computes totalAmount', async () => {
    const before = await procurementApi.list()
    const beforeIds = new Set(before.map((r) => r.id))

    const created = await procurementApi.create({
      requesterId: 'U001',
      departmentId: 'D001',
      supplierId: 'S001',
      notes: 'unit test request',
      items: [
        { itemId: 'INV-1001', quantity: 10, unitCost: 4.20 },
        { itemId: 'INV-1002', quantity: 6,  unitCost: 3.10 },
      ],
    })

    expect(created.id).toMatch(/^REQ-\d{4}-\d{4}$/)
    expect(beforeIds.has(created.id)).toBe(false)
    expect(created.status).toBe('pending')
    expect(created.items.length).toBe(2)
    expect(created.totalAmount).toBeCloseTo(10 * 4.20 + 6 * 3.10, 2)

    const after = await procurementApi.list()
    expect(after.length).toBe(before.length + 1)
    expect(after[0].id).toBe(created.id)
  })

  it('rejects when items is empty', async () => {
    await expect(
      procurementApi.create({
        requesterId: 'U001',
        departmentId: 'D001',
        items: [],
      }),
    ).rejects.toThrow(/at least one line item/i)
  })

  it('persists the line items so subsequent list calls include them', async () => {
    const created = await procurementApi.create({
      requesterId: 'U002',
      departmentId: 'D006',
      items: [{ itemId: 'INV-1006', quantity: 25, unitCost: 6.75 }],
    })
    const list = await procurementApi.list()
    const persisted = list.find((r) => r.id === created.id)!
    expect(persisted.items.length).toBe(1)
    expect(persisted.items[0].itemId).toBe('INV-1006')
    expect(persisted.totalAmount).toBeCloseTo(25 * 6.75, 2)
  })

  it('seeds an empty approval chain when approvers are provided', async () => {
    const created = await chainFixture(['U002', 'U001'])
    expect(created.approvers).toEqual(['U002', 'U001'])
    expect(created.currentApproverIndex).toBe(0)
    expect(created.approvals).toEqual([])
  })

  it('throws when the requester is listed as an approver on their own request', async () => {
    await expect(
      procurementApi.create({
        requesterId: 'U003',
        departmentId: 'D001',
        approvers: ['U002', 'U003', 'U001'],
        items: [{ itemId: 'INV-1001', quantity: 1, unitCost: 5.0 }],
      }),
    ).rejects.toThrow(/requester cannot be an approver/i)
  })
})

describe('procurementApi.approve — chain mode', () => {
  it('appends approval, advances pointer, keeps status pending until last signer', async () => {
    const req = await chainFixture(['U002', 'U001'])

    const after1 = await procurementApi.approve(req.id, 'U002', 'sales-team OK')
    expect(after1.status).toBe('pending')
    expect(after1.currentApproverIndex).toBe(1)
    expect(after1.approvals).toHaveLength(1)
    expect(after1.approvals![0].approverId).toBe('U002')
    expect(after1.approvals![0].comment).toBe('sales-team OK')

    const after2 = await procurementApi.approve(req.id, 'U001')
    expect(after2.status).toBe('approved')
    expect(after2.currentApproverIndex).toBe(2)
    expect(after2.approvedBy).toBe('U001')
    expect(after2.approvedAt).toBeTruthy()
  })

  it('rejects when signer is not the next expected approver', async () => {
    const req = await chainFixture(['U002', 'U001'])
    await expect(procurementApi.approve(req.id, 'U001')).rejects.toThrow(/not the next approver/i)
  })

  it('throws when approving an already-approved request', async () => {
    const req = await chainFixture(['U002'])
    await procurementApi.approve(req.id, 'U002')
    await expect(procurementApi.approve(req.id, 'U002')).rejects.toThrow(/not pending/i)
  })

  it('emits an audit entry with action=approve only on final signature', async () => {
    const req = await chainFixture(['U002', 'U001'])
    await procurementApi.approve(req.id, 'U002')
    const intermediate = mockAuditLog.find((e) => e.module === 'Procurement' && e.detail.includes(req.id))!
    expect(intermediate.action).toBe('update')

    await procurementApi.approve(req.id, 'U001')
    const finalEntry = mockAuditLog.find(
      (e) => e.module === 'Procurement' && e.action === 'approve' && e.detail.includes(req.id),
    )!
    expect(finalEntry).toBeTruthy()
    expect(finalEntry.detail).toContain('Final approval')
  })
})

describe('procurementApi.updateMeta', () => {
  it('updates notes and needed-by on a pending request', async () => {
    const req = await chainFixture()
    const result = await procurementApi.updateMeta(
      req.id,
      { notes: 'Updated notes', neededBy: '2026-12-31' },
      req.requesterId,
    )
    expect(result.notes).toBe('Updated notes')
    expect(result.neededBy).toBe('2026-12-31')
  })

  it('clears neededBy when patched with empty string', async () => {
    const req = await chainFixture()
    await procurementApi.updateMeta(req.id, { neededBy: '2026-12-31' }, req.requesterId)
    const result = await procurementApi.updateMeta(req.id, { neededBy: '' }, req.requesterId)
    expect(result.neededBy).toBeUndefined()
  })

  it('throws when caller is not the requester', async () => {
    const req = await chainFixture()
    await expect(
      procurementApi.updateMeta(req.id, { notes: 'no' }, 'U999'),
    ).rejects.toThrow(/only the requester/i)
  })

  it('throws when request is not pending', async () => {
    const req = await chainFixture(['U002'])
    await procurementApi.approve(req.id, 'U002')
    await expect(
      procurementApi.updateMeta(req.id, { notes: 'too late' }, req.requesterId),
    ).rejects.toThrow(/not pending/i)
  })

  it('does NOT record an audit entry when nothing actually changed', async () => {
    const req = await chainFixture()
    await procurementApi.updateMeta(req.id, { notes: 'initial' }, req.requesterId)
    const beforeLen = mockAuditLog.length
    await procurementApi.updateMeta(req.id, { notes: 'initial' }, req.requesterId)
    expect(mockAuditLog.length).toBe(beforeLen)
  })
})

describe('procurementApi.cancel', () => {
  it('flips status to cancelled and stamps reason/by/at', async () => {
    const req = await chainFixture()
    const result = await procurementApi.cancel(req.id, 'requirements changed', req.requesterId)
    expect(result.status).toBe('cancelled')
    expect(result.cancelReason).toBe('requirements changed')
    expect(result.cancelledBy).toBe(req.requesterId)
    expect(result.cancelledAt).toBeTruthy()
  })

  it('throws when caller is not the requester (and not admin)', async () => {
    const req = await chainFixture()
    await expect(procurementApi.cancel(req.id, 'no', 'U999')).rejects.toThrow(/only the requester/i)
  })

  it('allows an admin override to cancel a request not their own', async () => {
    const req = await chainFixture()
    const result = await procurementApi.cancel(req.id, 'admin override', 'U001', { actorIsAdmin: true })
    expect(result.status).toBe('cancelled')
    expect(result.cancelledBy).toBe('U001')
  })

  it('throws when the request is not pending', async () => {
    const req = await chainFixture(['U002'])
    await procurementApi.approve(req.id, 'U002')
    await expect(procurementApi.cancel(req.id, 'too late', req.requesterId)).rejects.toThrow(/not pending/i)
  })

  it('records an audit entry with the reason in detail', async () => {
    const req = await chainFixture()
    const beforeLen = mockAuditLog.length
    await procurementApi.cancel(req.id, 'changed mind', req.requesterId)
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    expect(mockAuditLog[0].detail).toContain('Cancelled')
    expect(mockAuditLog[0].detail).toContain('changed mind')
  })
})

describe('procurementApi.reject', () => {
  it('flips status to rejected and stamps reason/by/at', async () => {
    const req = await chainFixture()
    const result = await procurementApi.reject(req.id, 'over budget', 'U001')
    expect(result.status).toBe('rejected')
    expect(result.rejectedReason).toBe('over budget')
    expect(result.rejectedBy).toBe('U001')
    expect(result.rejectedAt).toBeTruthy()
  })

  it('throws when the request is not pending', async () => {
    const req = await chainFixture(['U002'])
    await procurementApi.approve(req.id, 'U002')
    await expect(procurementApi.reject(req.id, 'too late', 'U001')).rejects.toThrow(/not pending/i)
  })

  it('records an audit entry with the reason in detail', async () => {
    const req = await chainFixture()
    const beforeLen = mockAuditLog.length
    await procurementApi.reject(req.id, 'duplicate request', 'U001')
    expect(mockAuditLog.length).toBe(beforeLen + 1)
    expect(mockAuditLog[0].action).toBe('reject')
    expect(mockAuditLog[0].detail).toContain('duplicate request')
  })
})
