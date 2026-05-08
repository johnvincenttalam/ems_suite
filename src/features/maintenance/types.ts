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

export interface WorkOrder {
  id: string
  assetId: string
  title: string
  description?: string
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
  checklistId?: string
  createdAt: string
  /** User ID of the creator. */
  createdBy: string
}
