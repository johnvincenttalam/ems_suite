import type { InspectionResult, WorkOrder, WorkOrderPart, WorkOrderPriority, WorkOrderType } from '@/features/maintenance/types'
import { mockWorkOrders } from '@/features/maintenance/data/mock-maintenance'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
import { mockUsers } from '@/features/users/data/mock-users'
import type { User } from '@/features/users/types'
import { isModuleManagerOrAbove, moduleRoleOf } from '@/features/auth/lib/access'
import { mockAssets } from '@/features/assets/data/mock-assets'
import { mockVehicles } from '@/features/fleet/data/mock-fleet'
import { assetsApi } from '@/features/assets/api/assets-api'
import { inventoryApi } from '@/features/inventory/api/inventory-api'
import { mockInventoryItems } from '@/features/inventory/data/mock-inventory'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'
import { attachmentAdapter } from '@/shared/attachments'
import type { Attachment } from '@/shared/attachments'
// import { http } from '@/shared/lib/http'

/** Caller must have any role in maintenance — for actions any member can take
 * (e.g. create a WO, list, attach a file). */
function assertMaintenanceAccess(actorId: string): User {
  const actor = mockUsers.find((u) => u.id === actorId)
  if (!actor) throw new Error(`Actor ${actorId} not found`)
  if (!moduleRoleOf(actor, 'maintenance')) {
    throw new Error('Maintenance module access required')
  }
  return actor
}

/** Caller must be manager or admin in maintenance — destructive / oversight
 * actions only (cancel, update metadata, reassign, reschedule). */
function assertMaintenanceManager(actorId: string): User {
  const actor = assertMaintenanceAccess(actorId)
  if (!isModuleManagerOrAbove(actor, 'maintenance')) {
    throw new Error('Manager or admin access required for this action')
  }
  return actor
}

/** Caller can act on this WO directly: manager+ for any WO, member only on
 * a WO assigned to them. Used for start/complete/attachments. */
function assertCanActOnWorkOrder(actorId: string, wo: WorkOrder): User {
  const actor = assertMaintenanceAccess(actorId)
  if (isModuleManagerOrAbove(actor, 'maintenance')) return actor
  if (wo.assignedTo !== actorId) {
    throw new Error('You can only act on work orders assigned to you')
  }
  return actor
}

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

/** Resolve a WO's target (asset or vehicle) to a label for audit-log narration. */
function workOrderTargetLabel(wo: Pick<WorkOrder, 'assetId' | 'vehicleId'>): string {
  if (wo.vehicleId) {
    const v = mockVehicles.find((x) => x.id === wo.vehicleId)
    return v ? `${v.model} (${v.plateNumber})` : wo.vehicleId
  }
  if (wo.assetId) {
    const a = mockAssets.find((x) => x.id === wo.assetId)
    return a ? `${a.name} (${a.assetCode})` : wo.assetId
  }
  return 'unknown target'
}

/** Returns true if the same target (asset OR vehicle) has any other open
 * (pending/ongoing) WOs besides the one excluded by `excludeId`. */
function hasOtherOpenWorkOrders(wo: WorkOrder, excludeId: string): boolean {
  return mockWorkOrders.some(
    (other) =>
      other.id !== excludeId &&
      (other.status === 'pending' || other.status === 'ongoing') &&
      ((wo.assetId && other.assetId === wo.assetId) ||
        (wo.vehicleId && other.vehicleId === wo.vehicleId)),
  )
}

/**
 * Validate that every part in `parts` can be issued from inventory. Throws on
 * the first failure so we can refuse a completion before mutating WO state.
 *
 * Mirrors the check inside `inventoryApi.addMovement` (item exists, stock is
 * sufficient unless `allowNegativeStock` is on). We pre-flight here so we
 * never end up in a half-deducted state where part 1 issued but part 2 failed.
 */
function preflightPartsAvailability(parts: WorkOrderPart[]): void {
  if (parts.length === 0) return
  const allowNegative = useInventorySettings.getState().settings.allowNegativeStock
  for (const p of parts) {
    const item = mockInventoryItems.find((i) => i.id === p.itemId)
    if (!item) throw new Error(`Part ${p.itemId} not found in inventory`)
    if (!allowNegative && p.quantity > item.quantity) {
      throw new Error(
        `Cannot use ${p.quantity} × ${item.name} — only ${item.quantity} on hand. ` +
        `Enable "Allow negative stock" in Inventory settings to override.`,
      )
    }
  }
}

interface CreateWorkOrderInput {
  title: string
  description?: string
  /** Exactly one of `assetId` or `vehicleId` must be set. */
  assetId?: string
  vehicleId?: string
  assignedTo: string
  type?: WorkOrderType
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
    assertMaintenanceAccess(input.createdBy)
    if (!input.assetId && !input.vehicleId) {
      throw new Error('Work order must target either an asset or a vehicle')
    }
    if (input.assetId && input.vehicleId) {
      throw new Error('Work order cannot target both an asset and a vehicle')
    }
    const now = new Date().toISOString()
    const workOrder: WorkOrder = {
      id: nextWorkOrderId(),
      assetId: input.assetId,
      vehicleId: input.vehicleId,
      title: input.title,
      description: input.description,
      type: input.type ?? (input.sourceIssueId ? 'corrective' : 'preventive'),
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
      detail: `Created ${workOrder.id} — ${workOrder.title} on ${workOrderTargetLabel(workOrder)}`,
    })
    return workOrder
  },

  start: async (id: string, byUserId: string): Promise<WorkOrder> => {
    await delay(120)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status !== 'pending') throw new Error(`Work order ${id} is not pending`)
    assertCanActOnWorkOrder(byUserId, wo)

    const actor = userName(byUserId)
    // Cross-module: flip asset to maintenance status BEFORE we mutate the WO,
    // so a thrown asset error (e.g. disposed) leaves the WO untouched. Vehicle-
    // targeted WOs skip this — vehicle status is managed by Fleet directly.
    if (wo.assetId) {
      assetsApi.markMaintenanceStarted(wo.assetId, actor)
    }

    wo.status = 'ongoing'

    recordAudit({
      userId: actor,
      action: 'update',
      module: 'Maintenance',
      detail: `Started ${wo.id} — ${wo.title}`,
    })
    return wo
  },

  complete: async (
    id: string,
    byUserId: string,
    options: {
      completionNotes?: string
      laborHours?: number
      laborCost?: number
      partsUsed?: WorkOrderPart[]
      inspectionResult?: InspectionResult
    } = {},
  ): Promise<WorkOrder> => {
    await delay(120)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status !== 'ongoing') throw new Error(`Work order ${id} is not in progress`)
    assertCanActOnWorkOrder(byUserId, wo)

    if (options.laborHours !== undefined && options.laborHours < 0) {
      throw new Error('Labor hours cannot be negative')
    }
    if (options.laborCost !== undefined && options.laborCost < 0) {
      throw new Error('Labor cost cannot be negative')
    }
    if (options.partsUsed) {
      for (const p of options.partsUsed) {
        if (p.quantity <= 0) throw new Error('Part quantity must be > 0')
        if (p.unitCost < 0) throw new Error('Part unit cost cannot be negative')
      }
    }
    if (options.inspectionResult && wo.type !== 'inspection') {
      throw new Error('inspectionResult is only valid for inspection-type work orders')
    }

    // Pre-flight before mutating WO state — refuse completion if any part
    // can't be sourced from inventory. This keeps WO state and inventory
    // movements consistent: either both happen or neither.
    const partsToIssue = options.partsUsed ?? []
    preflightPartsAvailability(partsToIssue)

    const actor = userName(byUserId)
    wo.status = 'completed'
    wo.completedDate = new Date().toISOString()
    if (options.completionNotes) wo.completionNotes = options.completionNotes
    if (options.laborHours !== undefined) wo.laborHours = options.laborHours
    if (options.laborCost !== undefined) wo.laborCost = options.laborCost
    if (options.partsUsed) wo.partsUsed = options.partsUsed
    if (options.inspectionResult) wo.inspectionResult = options.inspectionResult

    // Issue stock-out movements for each part. Pre-flight already validated
    // availability so these are not expected to throw.
    for (const p of partsToIssue) {
      try {
        await inventoryApi.addMovement({
          itemId: p.itemId,
          type: 'out',
          quantity: p.quantity,
          reason: `Used in ${wo.id} — ${wo.title}`,
          referenceNumber: wo.id,
          createdBy: actor,
        })
      } catch (err) {
        // Should be unreachable given the pre-flight. If it does fire (e.g.
        // settings flipped mid-completion), surface it but leave the WO
        // completed — operator needs to reconcile manually.
        recordAudit({
          userId: actor,
          action: 'update',
          module: 'Maintenance',
          detail: `Stock-out failed for ${wo.id}: ${err instanceof Error ? err.message : 'unknown error'}`,
        })
      }
    }

    if (wo.assetId && !hasOtherOpenWorkOrders(wo, wo.id)) {
      try {
        assetsApi.markMaintenanceEnded(wo.assetId, actor)
      } catch {
        // Asset gone or already in a non-maintenance state — non-fatal for
        // the WO completion itself.
      }
    }

    const partsTotal = (wo.partsUsed ?? []).reduce((s, p) => s + p.quantity * p.unitCost, 0)
    const total = (wo.laborCost ?? 0) + partsTotal
    const costSuffix = total > 0 ? ` (cost ${total.toFixed(2)})` : ''
    recordAudit({
      userId: actor,
      action: 'update',
      module: 'Maintenance',
      detail: `Completed ${wo.id}${costSuffix}${options.completionNotes ? ` — ${options.completionNotes}` : ''}`,
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
    assertMaintenanceManager(byUserId)

    const actor = userName(byUserId)
    const wasOngoing = wo.status === 'ongoing'
    wo.status = 'cancelled'
    wo.cancelledDate = new Date().toISOString()
    wo.cancelledBy = actor
    wo.cancelledReason = reason

    if (wasOngoing && wo.assetId && !hasOtherOpenWorkOrders(wo, wo.id)) {
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

  /**
   * Edit metadata on a pending work order. Restricted to fields that don't
   * invalidate downstream state — title/description/type/priority/checklistId.
   * Asset can't be edited (would orphan asset-side maintenance events) and
   * schedule/assignee already have their own purpose-built endpoints
   * (`reschedule`, `reassign`) that work past pending.
   */
  update: async (
    id: string,
    patch: {
      title?: string
      description?: string
      type?: WorkOrderType
      priority?: WorkOrderPriority
      checklistId?: string
    },
    byUserId: string,
  ): Promise<WorkOrder> => {
    await delay(100)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status !== 'pending') throw new Error(`Work order ${id} is not pending`)
    // Creator can edit their own pending WO; otherwise manager+ only.
    if (wo.createdBy !== byUserId) assertMaintenanceManager(byUserId)
    else assertMaintenanceAccess(byUserId)

    const changes: string[] = []
    if (patch.title !== undefined && patch.title !== wo.title) {
      changes.push(`title "${wo.title}" → "${patch.title}"`)
      wo.title = patch.title
    }
    if (patch.description !== undefined && patch.description !== (wo.description ?? '')) {
      changes.push('description')
      wo.description = patch.description || undefined
    }
    if (patch.type !== undefined && patch.type !== wo.type) {
      changes.push(`type ${wo.type} → ${patch.type}`)
      wo.type = patch.type
    }
    if (patch.priority !== undefined && patch.priority !== wo.priority) {
      changes.push(`priority ${wo.priority} → ${patch.priority}`)
      wo.priority = patch.priority
    }
    if (patch.checklistId !== undefined && patch.checklistId !== (wo.checklistId ?? '')) {
      changes.push('checklist')
      wo.checklistId = patch.checklistId || undefined
    }

    // No-op patch — don't pollute the audit log.
    if (changes.length === 0) return wo

    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `Edited ${wo.id} — ${changes.join(', ')}`,
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
    assertMaintenanceManager(byUserId)

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
    assertMaintenanceManager(byUserId)

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

  /**
   * Attach pre-uploaded files to a work order. Attachments must already be
   * `Attachment` records produced by `attachmentAdapter.upload()` — the API
   * is metadata-only because storage is an adapter concern. Allowed in any
   * status except cancelled (no point) so technicians can attach before/
   * during/after the job.
   */
  addAttachments: async (id: string, attachments: Attachment[], byUserId: string): Promise<WorkOrder> => {
    await delay(80)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    if (wo.status === 'cancelled') throw new Error(`Cannot attach files to a cancelled work order`)
    if (attachments.length === 0) return wo
    assertCanActOnWorkOrder(byUserId, wo)

    wo.attachments = [...(wo.attachments ?? []), ...attachments]

    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `Attached ${attachments.length} file${attachments.length === 1 ? '' : 's'} to ${wo.id}: ${attachments.map((a) => a.name).join(', ')}`,
    })
    return wo
  },

  removeAttachment: async (id: string, attachmentId: string, byUserId: string): Promise<WorkOrder> => {
    await delay(80)
    const wo = mockWorkOrders.find((w) => w.id === id)
    if (!wo) throw new Error(`Work order ${id} not found`)
    const target = (wo.attachments ?? []).find((a) => a.id === attachmentId)
    if (!target) throw new Error(`Attachment ${attachmentId} not found on ${wo.id}`)
    assertCanActOnWorkOrder(byUserId, wo)

    wo.attachments = (wo.attachments ?? []).filter((a) => a.id !== attachmentId)

    // Best-effort cleanup; ignore failures (e.g. blob URL already revoked).
    attachmentAdapter.remove(target).catch(() => undefined)

    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `Removed attachment "${target.name}" from ${wo.id}`,
    })
    return wo
  },
}
