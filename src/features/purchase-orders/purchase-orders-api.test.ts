import { describe, it, expect } from 'vitest'
import { purchaseOrdersApi } from './api/purchase-orders-api'
import { mockSuppliers } from '@/features/suppliers'
import { mockInventoryItems } from '@/features/inventory'
import { mockProcurementRequests } from '@/features/procurement'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'

async function createFixture(opts?: { send?: boolean }) {
  return purchaseOrdersApi.create({
    supplierId: 'S001',
    requisitionId: 'REQ-2025-0312',
    createdBy: 'U001',
    sendImmediately: opts?.send ?? false,
    items: [{ itemId: 'INV-1001', quantity: 10, unitCost: 4.20 }],
  })
}

describe('purchaseOrdersApi.list', () => {
  it('returns POs newest-first', async () => {
    const result = await purchaseOrdersApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].createdAt >= result[i].createdAt).toBe(true)
    }
  })

  it('every PO has at least one line item', async () => {
    const result = await purchaseOrdersApi.list()
    expect(result.every((p) => p.items.length > 0)).toBe(true)
  })

  it('totalAmount equals sum of (qty × unit cost) over line items', async () => {
    const result = await purchaseOrdersApi.list()
    for (const po of result) {
      const expected = po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0)
      expect(po.totalAmount).toBeCloseTo(expected, 2)
    }
  })

  it('every supplierId references a known supplier', async () => {
    const result = await purchaseOrdersApi.list()
    const ids = new Set(mockSuppliers.map((s) => s.id))
    expect(result.every((p) => ids.has(p.supplierId))).toBe(true)
  })

  it('every requisitionId references a known requisition', async () => {
    const result = await purchaseOrdersApi.list()
    const ids = new Set(mockProcurementRequests.map((r) => r.id))
    expect(result.every((p) => ids.has(p.requisitionId))).toBe(true)
  })

  it('every line item references a known inventory item', async () => {
    const result = await purchaseOrdersApi.list()
    const ids = new Set(mockInventoryItems.map((i) => i.id))
    const lines = result.flatMap((p) => p.items)
    expect(lines.every((l) => ids.has(l.itemId))).toBe(true)
  })
})

describe('purchaseOrdersApi.create', () => {
  it('inserts a new draft PO when sendImmediately is false', async () => {
    const before = await purchaseOrdersApi.list()
    const beforeIds = new Set(before.map((p) => p.id))
    const created = await createFixture({ send: false })

    expect(created.id).toMatch(/^PO-\d{4}-\d{4}$/)
    expect(beforeIds.has(created.id)).toBe(false)
    expect(created.status).toBe('draft')
    expect(created.sentAt).toBeUndefined()
    expect(created.items.length).toBe(1)
    expect(created.totalAmount).toBeCloseTo(10 * 4.20, 2)

    const after = await purchaseOrdersApi.list()
    expect(after.length).toBe(before.length + 1)
    expect(after[0].id).toBe(created.id)
  })

  it('inserts a new ordered PO with sentAt when sendImmediately is true', async () => {
    const created = await createFixture({ send: true })
    expect(created.status).toBe('ordered')
    expect(created.sentAt).toBeTruthy()
  })

  it('rejects when items is empty', async () => {
    await expect(
      purchaseOrdersApi.create({
        supplierId: 'S001',
        requisitionId: 'REQ-2025-0312',
        createdBy: 'U001',
        items: [],
      }),
    ).rejects.toThrow(/at least one line item/i)
  })

  it('records an audit entry on create', async () => {
    const beforeLen = mockAuditLog.length
    const created = await createFixture({ send: true })
    expect(mockAuditLog.length).toBeGreaterThan(beforeLen)
    const entry = mockAuditLog.find((e) => e.module === 'Procurement' && e.detail.includes(created.id))
    expect(entry).toBeTruthy()
  })
})

describe('purchaseOrdersApi.send', () => {
  it('flips draft → ordered and stamps sentAt', async () => {
    const draft = await createFixture({ send: false })
    const sent = await purchaseOrdersApi.send(draft.id, 'U001')
    expect(sent.status).toBe('ordered')
    expect(sent.sentAt).toBeTruthy()
  })

  it('throws when PO is not a draft', async () => {
    const sent = await createFixture({ send: true })
    await expect(purchaseOrdersApi.send(sent.id, 'U001')).rejects.toThrow(/not a draft/i)
  })
})

describe('purchaseOrdersApi.cancel', () => {
  it('flips status to cancelled and stamps reason/by/at', async () => {
    const po = await createFixture({ send: true })
    const cancelled = await purchaseOrdersApi.cancel(po.id, 'supplier out of stock', 'U001')
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancelReason).toBe('supplier out of stock')
    expect(cancelled.cancelledBy).toBe('U001')
    expect(cancelled.cancelledAt).toBeTruthy()
  })

  it('throws when already cancelled', async () => {
    const po = await createFixture({ send: true })
    await purchaseOrdersApi.cancel(po.id, 'reason', 'U001')
    await expect(purchaseOrdersApi.cancel(po.id, 'again', 'U001')).rejects.toThrow(/already cancelled/i)
  })
})

describe('purchaseOrdersApi.listForRequisition', () => {
  it('returns only POs that reference the given requisition', async () => {
    const ours = await purchaseOrdersApi.listForRequisition('REQ-2025-0312')
    expect(ours.every((p) => p.requisitionId === 'REQ-2025-0312')).toBe(true)
    expect(ours.length).toBeGreaterThan(0)
  })
})
