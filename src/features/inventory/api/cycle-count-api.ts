import type { CycleCountSession, StockMovement } from '@/features/inventory/types'
import { mockCycleCountSessions, mockInventoryItems, mockStockMovements } from '@/features/inventory/data/mock-inventory'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 300 + 200))

let sessionCounter = mockCycleCountSessions.length

function nextSessionId(): string {
  sessionCounter += 1
  return `CC-${String(sessionCounter).padStart(4, '0')}`
}

interface ScheduleSessionInput {
  warehouseId: string
  categoryId?: string
  scheduledDate: string
  createdBy: string
}

/**
 * Cycle count API. Sessions snapshot expected stock at schedule time so
 * subsequent stock movements don't pollute the count target. Counters
 * record actual quantities; finalizing converts variances into auto-applied
 * adjustment movements (the count itself is the authorization).
 */
export const cycleCountApi = {
  list: async (): Promise<CycleCountSession[]> => {
    await delay()
    return [...mockCycleCountSessions].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
  },

  scheduleSession: async (input: ScheduleSessionInput): Promise<CycleCountSession> => {
    await delay(150)
    // Snapshot items currently in this warehouse (and category if specified).
    const inScope = mockInventoryItems.filter((i) => {
      if (i.warehouseId !== input.warehouseId) return false
      if (input.categoryId && i.categoryId !== input.categoryId) return false
      return true
    })
    if (inScope.length === 0) throw new Error('No items match the warehouse / category filter')

    const session: CycleCountSession = {
      id: nextSessionId(),
      warehouseId: input.warehouseId,
      categoryId: input.categoryId,
      scheduledDate: input.scheduledDate,
      status: 'scheduled',
      createdBy: input.createdBy,
      lines: inScope.map((i) => ({ itemId: i.id, expectedQty: i.quantity })),
    }
    mockCycleCountSessions.unshift(session)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Inventory',
      detail: `Scheduled cycle count ${session.id} (${inScope.length} items, ${input.scheduledDate})`,
    })

    return session
  },

  startSession: async (sessionId: string, byName: string): Promise<CycleCountSession> => {
    await delay(120)
    const s = mockCycleCountSessions.find((x) => x.id === sessionId)
    if (!s) throw new Error(`Session ${sessionId} not found`)
    if (s.status !== 'scheduled') throw new Error(`Session ${sessionId} is not scheduled`)
    s.status = 'in_progress'
    s.startedAt = new Date().toISOString()

    recordAudit({
      userId: byName,
      action: 'update',
      module: 'Inventory',
      detail: `Started cycle count ${s.id}`,
    })
    return s
  },

  recordCount: async (
    sessionId: string,
    itemId: string,
    actualQty: number,
    counterName: string,
  ): Promise<CycleCountSession> => {
    await delay(80)
    const s = mockCycleCountSessions.find((x) => x.id === sessionId)
    if (!s) throw new Error(`Session ${sessionId} not found`)
    if (s.status === 'completed' || s.status === 'cancelled') {
      throw new Error(`Session ${sessionId} is ${s.status}; counts cannot be edited`)
    }
    // Auto-promote scheduled → in_progress on the first count.
    if (s.status === 'scheduled') {
      s.status = 'in_progress'
      s.startedAt = new Date().toISOString()
    }
    const line = s.lines.find((l) => l.itemId === itemId)
    if (!line) throw new Error(`Item ${itemId} is not in session ${sessionId}`)
    line.actualQty = actualQty
    line.countedAt = new Date().toISOString()
    line.countedBy = counterName
    return s
  },

  finalizeSession: async (sessionId: string, finalizerName: string): Promise<CycleCountSession> => {
    await delay(160)
    const s = mockCycleCountSessions.find((x) => x.id === sessionId)
    if (!s) throw new Error(`Session ${sessionId} not found`)
    if (s.status === 'completed') throw new Error(`Session ${sessionId} is already completed`)
    if (s.status === 'cancelled') throw new Error(`Session ${sessionId} was cancelled`)

    const counted = s.lines.filter((l) => l.actualQty !== undefined)
    if (counted.length === 0) throw new Error('No lines have been counted yet')

    const finalizedAt = new Date().toISOString()
    let appliedCount = 0
    for (const line of counted) {
      const variance = (line.actualQty ?? 0) - line.expectedQty
      if (variance === 0) continue
      // Generate an auto-applied adjustment movement. The cycle count itself
      // is the authorization, so we bypass the pending → approve loop.
      const item = mockInventoryItems.find((i) => i.id === line.itemId)
      if (!item) continue
      const movement: StockMovement = {
        id: `MV-CC-${s.id}-${line.itemId}`,
        itemId: line.itemId,
        type: 'adjustment',
        quantity: variance,
        sourceLocationId: item.warehouseId,
        reason: `Cycle count ${s.id} — ${variance > 0 ? 'found' : 'shrinkage'}`,
        createdAt: finalizedAt,
        createdBy: finalizerName,
        status: 'applied',
        approverId: finalizerName,
        approvedBy: finalizerName,
        approvedAt: finalizedAt,
      }
      mockStockMovements.unshift(movement)
      item.quantity += variance
      appliedCount += 1
    }

    s.status = 'completed'
    s.completedAt = finalizedAt
    s.finalizedBy = finalizerName

    recordAudit({
      userId: finalizerName,
      action: 'approve',
      module: 'Inventory',
      detail: `Finalized cycle count ${s.id} — ${counted.length} counted, ${appliedCount} adjustment${appliedCount === 1 ? '' : 's'} posted`,
    })

    return s
  },

  cancelSession: async (sessionId: string, byName: string, reason: string): Promise<CycleCountSession> => {
    await delay(120)
    const s = mockCycleCountSessions.find((x) => x.id === sessionId)
    if (!s) throw new Error(`Session ${sessionId} not found`)
    if (s.status === 'completed') throw new Error(`Session ${sessionId} is already completed`)
    s.status = 'cancelled'
    recordAudit({
      userId: byName,
      action: 'update',
      module: 'Inventory',
      detail: `Cancelled cycle count ${s.id} — ${reason}`,
    })
    return s
  },
}
