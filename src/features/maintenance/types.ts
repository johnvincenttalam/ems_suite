/**
 * Lifecycle of a work order.
 *  - pending:   scheduled but not yet underway. Asset is unaffected.
 *  - ongoing:   actively being worked. Triggers asset.status='maintenance'
 *               on first transition (handled by maintenanceApi.start).
 *  - completed: finished. If this was the last open WO for the asset, the
 *               asset flips back to 'active'.
 *  - cancelled: dropped before completion. Same asset side-effect as completed.
 */
export type WorkOrderStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled'

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Classifies what a work order is doing on the asset.
 *  - preventive: scheduled service to prevent failure (oil change, filter, etc.)
 *  - corrective: addressing a known fault, wear, or escalated issue
 *  - inspection: checklist-driven inspection with pass/fail outcome
 */
export type WorkOrderType = 'preventive' | 'corrective' | 'inspection'

/**
 * Outcome of an inspection-type work order. Only set on completed inspection
 * WOs — corrective/preventive WOs leave this undefined.
 */
export type InspectionResult = 'pass' | 'fail'

/**
 * A part used in completing a work order. `unitCost` is captured at completion
 * time so the work-order total cost stays stable even if the inventory item's
 * unit cost changes later.
 *
 * Note: recording a part here does NOT deduct it from inventory stock — that
 * coupling will land with the GRN / stock-out integration. For now this is a
 * cost-tracking and parts-history record only.
 */
export interface WorkOrderPart {
  itemId: string
  quantity: number
  unitCost: number
}

export interface WorkOrder {
  id: string
  /** Targeted asset. Exactly one of `assetId` or `vehicleId` must be set. */
  assetId?: string
  /** Targeted fleet vehicle. Exactly one of `assetId` or `vehicleId` must be set. */
  vehicleId?: string
  title: string
  description?: string
  type: WorkOrderType
  priority: WorkOrderPriority
  /** User ID of the assigned technician. */
  assignedTo: string
  status: WorkOrderStatus
  scheduledDate: string
  completedDate?: string
  /** Free-text notes captured at completion (parts replaced, observations). */
  completionNotes?: string
  cancelledDate?: string
  cancelledBy?: string
  cancelledReason?: string
  /** Captured at completion. */
  laborHours?: number
  /** Captured at completion. Currency follows the app-wide locale. */
  laborCost?: number
  /** Captured at completion. Each entry's unitCost is locked in at that time. */
  partsUsed?: WorkOrderPart[]
  /** Captured at completion for inspection-type WOs only. */
  inspectionResult?: InspectionResult
  /** Files attached to this WO. Bytes live in the active AttachmentAdapter;
   * this array holds only metadata + opaque refs. */
  attachments?: import('@/shared/attachments').Attachment[]
  checklistId?: string
  /** Set when this WO was created by escalating an Issue. Lets the maintenance
   * UI prompt "Resolve linked issue?" on completion without scanning issues. */
  sourceIssueId?: string
  createdAt: string
  /** User ID of the creator. */
  createdBy: string
}

/** Sum of labor cost + parts (quantity × unitCost). Returns 0 when neither is set. */
export function workOrderTotalCost(wo: Pick<WorkOrder, 'laborCost' | 'partsUsed'>): number {
  const parts = (wo.partsUsed ?? []).reduce((s, p) => s + p.quantity * p.unitCost, 0)
  return (wo.laborCost ?? 0) + parts
}
