import type {
  POItem,
  POStatus,
  PurchaseOrder,
  PurchaseOrderWithItems,
} from '@/features/purchase-orders/types'
import {
  mockPOItems,
  mockPurchaseOrders,
} from '@/features/purchase-orders/data/mock-purchase-orders'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

function joinItems(orders: PurchaseOrder[], items: POItem[]): PurchaseOrderWithItems[] {
  return orders.map((po) => {
    const lineItems = items.filter((i) => i.poId === po.id)
    const totalAmount = lineItems.reduce((s, i) => s + i.quantity * i.unitCost, 0)
    return { ...po, items: lineItems, totalAmount }
  })
}

function nextPoId(): string {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`
  const maxNum = mockPurchaseOrders.reduce((max, p) => {
    if (!p.id.startsWith(prefix)) return max
    const n = Number(p.id.slice(prefix.length))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
}

function nextPoLineId(): string {
  const maxNum = mockPOItems.reduce((max, i) => {
    const n = Number(i.id.replace(/^POI-/, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `POI-${String(maxNum + 1).padStart(3, '0')}`
}

function findOrThrow(id: string): PurchaseOrder {
  const po = mockPurchaseOrders.find((p) => p.id === id)
  if (!po) throw new Error(`Purchase order ${id} not found`)
  return po
}

interface CreatePOInput {
  supplierId: string
  requisitionId: string
  expectedDeliveryDate?: string
  notes?: string
  createdBy: string
  /** Optional — defaults to false (drafts can be reviewed before sending). */
  sendImmediately?: boolean
  items: Array<{ itemId: string; quantity: number; unitCost: number }>
}

/**
 * PO API — swap with real HTTP when backend is ready:
 *   list:   () => http.get<PurchaseOrderWithItems[]>('/procurement/purchase-orders')
 *   create: (body) => http.post<PurchaseOrderWithItems>('/procurement/purchase-orders', body)
 *   send:   (id, actorId) => http.post(`/procurement/purchase-orders/${id}/send`)
 *   cancel: (id, reason, actorId) => http.post(`/procurement/purchase-orders/${id}/cancel`, { reason })
 */
export const purchaseOrdersApi = {
  list: async (): Promise<PurchaseOrderWithItems[]> => {
    await delay()
    return joinItems(mockPurchaseOrders, mockPOItems)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  listItems: async (): Promise<POItem[]> => {
    await delay()
    return mockPOItems
  },

  /** All POs that reference a given requisition (usually 0 or 1, but a request could legally fan out). */
  listForRequisition: async (requisitionId: string): Promise<PurchaseOrderWithItems[]> => {
    await delay(100)
    return joinItems(
      mockPurchaseOrders.filter((p) => p.requisitionId === requisitionId),
      mockPOItems,
    )
  },

  create: async (input: CreatePOInput): Promise<PurchaseOrderWithItems> => {
    await delay(150)
    if (input.items.length === 0) throw new Error('At least one line item is required')

    const id = nextPoId()
    const now = new Date().toISOString()
    const sent = input.sendImmediately ?? true

    const po: PurchaseOrder = {
      id,
      supplierId: input.supplierId,
      requisitionId: input.requisitionId,
      status: sent ? 'ordered' : 'draft',
      notes: input.notes,
      createdAt: now,
      createdBy: input.createdBy,
      sentAt: sent ? now : undefined,
      expectedDeliveryDate: input.expectedDeliveryDate,
    }
    mockPurchaseOrders.unshift(po)

    const lineItems: POItem[] = input.items.map((line) => ({
      id: nextPoLineId(),
      poId: id,
      itemId: line.itemId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      receivedQty: 0,
    }))
    mockPOItems.push(...lineItems)

    const totalAmount = lineItems.reduce((s, i) => s + i.quantity * i.unitCost, 0)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Procurement',
      detail: `Created ${id} from ${input.requisitionId} (${lineItems.length} line${lineItems.length === 1 ? '' : 's'})${sent ? ' — sent' : ''}`,
    })

    return { ...po, items: lineItems, totalAmount }
  },

  /** Flip a draft PO to ordered. Sends the document to the supplier (simulated). */
  send: async (id: string, actorId: string): Promise<PurchaseOrder> => {
    await delay(120)
    const po = findOrThrow(id)
    if (po.status !== 'draft') throw new Error(`PO ${id} is not a draft`)
    po.status = 'ordered'
    po.sentAt = new Date().toISOString()
    recordAudit({
      userId: actorId,
      action: 'update',
      module: 'Procurement',
      detail: `Sent ${id} to supplier`,
    })
    return po
  },

  /** Cancel a PO that hasn't been fully received yet. */
  cancel: async (id: string, reason: string, actorId: string): Promise<PurchaseOrder> => {
    await delay(120)
    const po = findOrThrow(id)
    if (po.status === 'completed') throw new Error(`PO ${id} is already completed`)
    if (po.status === 'cancelled') throw new Error(`PO ${id} is already cancelled`)
    po.status = 'cancelled'
    po.cancelledAt = new Date().toISOString()
    po.cancelledBy = actorId
    po.cancelReason = reason
    recordAudit({
      userId: actorId,
      action: 'update',
      module: 'Procurement',
      detail: `Cancelled ${id} — ${reason}`,
    })
    return po
  },

  /** Internal hook for the future GRN feature — recomputes status from received quantities. */
  recomputeStatus: async (id: string): Promise<POStatus> => {
    const po = findOrThrow(id)
    if (po.status === 'cancelled') return po.status
    const lines = mockPOItems.filter((i) => i.poId === id)
    const anyReceived = lines.some((l) => l.receivedQty > 0)
    const allReceived = lines.every((l) => l.receivedQty >= l.quantity)
    const next: POStatus = allReceived ? 'completed' : anyReceived ? 'partially_received' : po.status
    po.status = next
    return next
  },
}
