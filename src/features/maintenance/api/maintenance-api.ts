import type { WorkOrder, WorkOrderPriority } from '@/features/maintenance/types'
import { mockWorkOrders } from '@/features/maintenance/data/mock-maintenance'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
import { mockUsers } from '@/features/users/data/mock-users'
import { mockAssets } from '@/features/assets/data/mock-assets'
import { assetsApi } from '@/features/assets/api/assets-api'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

// Counter seeded from the highest existing WO-YYYY-NNNN number so synthesized
// IDs don't collide with mock seed data.
let woCounter = mockWorkOrders.reduce((max, wo) => {
  const m = wo.id.match(/^WO-\d{4}-(\d{4})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextWorkOrderId(): string {
  woCounter += 1
  const year = new Date().getFullYear()
  return `WO-${year}-${String(woCounter).padStart(4, '0')}`
}

/** Resolve a user ID to a display name for cross-module event narration. */
function userName(userId: string): string {
  return mockUsers.find((u) => u.id === userId)?.name ?? userId
}

/** Resolve an asset ID to a "Name (CODE)" string for audit-log narration. */
function assetLabel(assetId: string): string {
  const a = mockAssets.find((x) => x.id === assetId)
  return a ? `${a.name} (${a.assetCode})` : assetId
}

/** Returns true if the given asset has any other open (pending/ongoing) WOs
 * besides the one excluded by `excludeId`. Used by complete/cancel to decide
 * whether to flip the asset back to 'active'. */
function hasOtherOpenWorkOrders(assetId: string, excludeId: string): boolean {
  return mockWorkOrders.some(
    (wo) =>
      wo.assetId === assetId &&
      wo.id !== excludeId &&
      (wo.status === 'pending' || wo.status === 'ongoing'),
  )
}

interface CreateWorkOrderInput {
  title: string
  description?: string
  assetId: string
  assignedTo: string
  priority: WorkOrderPriority
  scheduledDate: string
  checklistId?: string
  /** Optional back-reference to the Issue that spawned this WO. */
  sourceIssueId?: string
  /** User ID of the creator. */
  createdBy: string
}

/**
 * Maintenance API. Manages work orders end-to-end. Two cross-module side
 * effects you need to know about:
 *
 *  - `start(id, by)` flips the asset to status='maintenance' (the asset
 *    side-effect is idempotent — multiple parallel WOs only emit one event).
 *  - `complete(id, by, ...)` and `cancel(id, by, reason)` flip the asset
 *    back to 'active' IFF this was the last open WO for the asset.
 */
export const maintenanceApi = {
  list: async (): Promise<WorkOrder[]> => {
    await delay()
    return [...mockWorkOrders].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  },

  create: async (input: CreateWorkOrderInput): Promise<WorkOrder> => {
    await delay(150)
    const now = new Date().toISOString()
    const workOrder: WorkOrder = {
      id: nextWorkOrderId(),
      assetId: input.assetId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      assignedTo: input.assignedTo,
      status: 'pending',
      scheduledDate: input.scheduledDate,
      checklistId: input.checklistId,
      sourceIssueId: input.sourceIssueId,
      createdAt: now,
      createdBy: input.createdBy,
    }
    mockWorkOrders.push(workOrder)

    recordAudit({
      userId: userName(input.createdBy),
      action: 'create',
      module: 'Maintenance',
      detail: `Created ${workOrder.id} — ${workOrder.title} on ${assetLabel(workOrder.assetId)}`,
    })
    return workOrder
  },

  start: async (id: string, byUserId: string): Promise<WorkOrder> => {
    await delay(120)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status !== 'pending') throw new Error(`Work order ${id} is not pending`)

    const actor = userName(byUserId)
    // Cross-module: flip asset to maintenance status BEFORE we mutate the WO,
    // so a thrown asset error (e.g. disposed) leaves the WO untouched.
    assetsApi.markMaintenanceStarted(wo.assetId, actor)

    wo.status = 'ongoing'

    recordAudit({
      userId: actor,
      action: 'update',
      module: 'Maintenance',
      detail: `Started ${wo.id} — ${wo.title}`,
    })
    return wo
  },

  complete: async (id: string, byUserId: string, completionNotes?: string): Promise<WorkOrder> => {
    await delay(120)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status !== 'ongoing') throw new Error(`Work order ${id} is not in progress`)

    const actor = userName(byUserId)
    wo.status = 'completed'
    wo.completedDate = new Date().toISOString()
    if (completionNotes) wo.completionNotes = completionNotes

    if (!hasOtherOpenWorkOrders(wo.assetId, wo.id)) {
      try {
        assetsApi.markMaintenanceEnded(wo.assetId, actor)
      } catch {
        // Asset gone or already in a non-maintenance state — non-fatal for
        // the WO completion itself.
      }
    }

    recordAudit({
      userId: actor,
      action: 'update',
      module: 'Maintenance',
      detail: `Completed ${wo.id}${completionNotes ? ` — ${completionNotes}` : ''}`,
    })
    return wo
  },

  cancel: async (id: string, byUserId: string, reason: string): Promise<WorkOrder> => {
    await delay(120)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status === 'completed') throw new Error(`Work order ${id} is already completed`)
    if (wo.status === 'cancelled') throw new Error(`Work order ${id} is already cancelled`)
    if (!reason.trim()) throw new Error(`Cancellation reason is required`)

    const actor = userName(byUserId)
    const wasOngoing = wo.status === 'ongoing'
    wo.status = 'cancelled'
    wo.cancelledDate = new Date().toISOString()
    wo.cancelledBy = actor
    wo.cancelledReason = reason

    if (wasOngoing && !hasOtherOpenWorkOrders(wo.assetId, wo.id)) {
      try {
        assetsApi.markMaintenanceEnded(wo.assetId, actor)
      } catch {
        // Same fall-through as complete.
      }
    }

    recordAudit({
      userId: actor,
      action: 'reject',
      module: 'Maintenance',
      detail: `Cancelled ${wo.id} — ${reason}`,
    })
    return wo
  },

  reassign: async (id: string, newAssigneeUserId: string, byUserId: string): Promise<WorkOrder> => {
    await delay(100)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status === 'completed' || wo.status === 'cancelled') {
      throw new Error(`Cannot reassign a ${wo.status} work order`)
    }
    if (wo.assignedTo === newAssigneeUserId) {
      throw new Error(`Work order is already assigned to that technician`)
    }

    const previousAssignee = wo.assignedTo
    wo.assignedTo = newAssigneeUserId

    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `Reassigned ${wo.id}: ${userName(previousAssignee)} → ${userName(newAssigneeUserId)}`,
    })
    return wo
  },

  reschedule: async (id: string, newDate: string, byUserId: string): Promise<WorkOrder> => {
    await delay(100)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status === 'completed' || wo.status === 'cancelled') {
      throw new Error(`Cannot reschedule a ${wo.status} work order`)
    }
    if (!newDate) throw new Error(`New schedule date is required`)
    if (wo.scheduledDate === newDate) return wo

    const previousDate = wo.scheduledDate
    wo.scheduledDate = newDate

    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `Rescheduled ${wo.id}: ${previousDate} → ${newDate}`,
    })
    return wo
  },
}
