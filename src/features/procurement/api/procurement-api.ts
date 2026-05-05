import type {
  ProcurementRequest,
  RequestApproval,
  RequestItem,
  RequestPriority,
  RequestWithItems,
} from '@/features/procurement/types'
import { mockProcurementRequests, mockRequestItems } from '@/features/procurement/data/mock-procurement'
import { mockInventoryItems } from '@/features/inventory'
import { inventoryApi } from '@/features/inventory/api/inventory-api'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

function joinItems(requests: ProcurementRequest[], items: RequestItem[]): RequestWithItems[] {
  return requests.map((r) => {
    const lineItems = items.filter((i) => i.requestId === r.id)
    const totalAmount = lineItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
    return { ...r, items: lineItems, totalAmount }
  })
}

interface CreateRequestInput {
  requesterId: string
  departmentId: string
  supplierId?: string
  notes?: string
  priority?: RequestPriority
  neededBy?: string
  /** Sequential approver chain. If omitted, defaults to single-step using the
   * legacy `approvedBy` model. */
  approvers?: string[]
  items: Array<{ itemId: string; quantity: number; unitCost: number }>
}

function nextRequestId(): string {
  const year = new Date().getFullYear()
  const prefix = `REQ-${year}-`
  const maxNum = mockProcurementRequests.reduce((max, r) => {
    if (!r.id.startsWith(prefix)) return max
    const n = Number(r.id.slice(prefix.length))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
}

function nextLineItemId(): string {
  const maxNum = mockRequestItems.reduce((max, i) => {
    const n = Number(i.id.replace(/^RI-/, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `RI-${String(maxNum + 1).padStart(3, '0')}`
}

function findOrThrow(requestId: string): ProcurementRequest {
  const r = mockProcurementRequests.find((x) => x.id === requestId)
  if (!r) throw new Error(`Request ${requestId} not found`)
  return r
}

/**
 * Procurement API — swap with real HTTP when backend is ready:
 *   list:      () => http.get<RequestWithItems[]>('/procurement/requests')
 *   create:    (body) => http.post<RequestWithItems>('/procurement/requests', body)
 *   approve:   (id, approverId, comment?) => http.post(`/procurement/requests/${id}/approvals`, { comment })
 *   reject:    (id, reason, rejecterId) => http.post(`/procurement/requests/${id}/reject`, { reason })
 */
export const procurementApi = {
  list: async (): Promise<RequestWithItems[]> => {
    await delay()
    return joinItems(mockProcurementRequests, mockRequestItems)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  listItems: async (): Promise<RequestItem[]> => {
    await delay()
    return mockRequestItems
  },

  /**
   * Submit a new procurement request as 'pending'. Inserts the request and
   * each line item, then emits an audit entry. If `approvers` is provided,
   * the request enters a sequential chain; otherwise it's single-step.
   */
  create: async (input: CreateRequestInput): Promise<RequestWithItems> => {
    await delay(150)
    if (input.items.length === 0) throw new Error('At least one line item is required')

    const id = nextRequestId()
    const now = new Date().toISOString()
    const approvers = input.approvers ?? []

    const request: ProcurementRequest = {
      id,
      requesterId: input.requesterId,
      departmentId: input.departmentId,
      supplierId: input.supplierId,
      status: 'pending',
      notes: input.notes,
      createdAt: now,
      priority: input.priority ?? 'normal',
      neededBy: input.neededBy,
      approvers: approvers.length > 0 ? [...approvers] : undefined,
      currentApproverIndex: approvers.length > 0 ? 0 : undefined,
      approvals: approvers.length > 0 ? [] : undefined,
    }
    mockProcurementRequests.unshift(request)

    const lineItems: RequestItem[] = input.items.map((line) => ({
      id: nextLineItemId(),
      requestId: id,
      itemId: line.itemId,
      quantity: line.quantity,
      unitCost: line.unitCost,
    }))
    mockRequestItems.push(...lineItems)

    const totalAmount = lineItems.reduce((s, i) => s + i.quantity * i.unitCost, 0)

    recordAudit({
      userId: input.requesterId,
      action: 'create',
      module: 'Procurement',
      detail: `Submitted ${id} (${lineItems.length} line${lineItems.length === 1 ? '' : 's'})`,
    })

    return { ...request, items: lineItems, totalAmount }
  },

  /**
   * Approve a pending request as the next expected approver.
   *
   * Chain mode (approvers populated): only `approvers[currentApproverIndex]`
   * may sign; the index advances. When the last approver signs, status flips
   * to 'approved' and stock-in movements are emitted.
   *
   * Legacy mode (no approvers): a single approve immediately closes the request.
   *
   * Throws if the request is not pending or the signer is not authorized.
   */
  approve: async (
    requestId: string,
    approverId: string,
    comment?: string,
  ): Promise<ProcurementRequest> => {
    await delay(150)
    const req = findOrThrow(requestId)
    if (req.status !== 'pending') throw new Error(`Request ${requestId} is not pending`)

    const now = new Date().toISOString()
    const isChain = !!req.approvers && req.approvers.length > 0

    if (isChain) {
      const idx = req.currentApproverIndex ?? 0
      const expected = req.approvers![idx]
      if (approverId !== expected) {
        throw new Error(`${approverId} is not the next approver for ${requestId}`)
      }
      const approval: RequestApproval = {
        approverId,
        approvedAt: now,
        ...(comment ? { comment } : {}),
      }
      req.approvals = [...(req.approvals ?? []), approval]
      req.currentApproverIndex = idx + 1
      const isFinal = req.currentApproverIndex >= req.approvers!.length
      if (isFinal) {
        req.status = 'approved'
        req.approvedBy = approverId
        req.approvedAt = now
      }

      recordAudit({
        userId: approverId,
        action: isFinal ? 'approve' : 'update',
        module: 'Procurement',
        detail: isFinal
          ? `Final approval on ${req.id} — approved`
          : `Signed off on ${req.id} (step ${idx + 1}/${req.approvers!.length})`,
      })

      if (isFinal) {
        await emitStockIn(req, approverId)
      }
      return req
    }

    // Legacy single-step
    req.status = 'approved'
    req.approvedBy = approverId
    req.approvedAt = now

    recordAudit({
      userId: approverId,
      action: 'approve',
      module: 'Procurement',
      detail: `Approved ${req.id}`,
    })

    await emitStockIn(req, approverId)
    return req
  },

  /**
   * Reject a pending request with a reason — works in both chain and legacy
   * modes. The currentApproverIndex is preserved so the audit trail shows
   * where the chain stopped.
   */
  reject: async (
    requestId: string,
    reason: string,
    rejecterId: string,
  ): Promise<ProcurementRequest> => {
    await delay(150)
    const req = findOrThrow(requestId)
    if (req.status !== 'pending') throw new Error(`Request ${requestId} is not pending`)

    req.status = 'rejected'
    req.rejectedBy = rejecterId
    req.rejectedAt = new Date().toISOString()
    req.rejectedReason = reason
    if (!req.approvedBy) req.approvedBy = rejecterId

    recordAudit({
      userId: rejecterId,
      action: 'reject',
      module: 'Procurement',
      detail: `Rejected ${req.id} — ${reason}`,
    })

    return req
  },
}

async function emitStockIn(req: ProcurementRequest, approverId: string): Promise<void> {
  const lineItems = mockRequestItems.filter((i) => i.requestId === req.id)
  for (const line of lineItems) {
    const item = mockInventoryItems.find((i) => i.id === line.itemId)
    await inventoryApi.addMovement({
      itemId: line.itemId,
      type: 'in',
      quantity: line.quantity,
      destinationLocationId: item?.warehouseId,
      reason: `${req.id} received`,
      createdBy: approverId,
    })
  }
}
