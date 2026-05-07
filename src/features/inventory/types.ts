export type StockMovementType = 'in' | 'out' | 'transfer' | 'adjustment'

/**
 * Lifecycle of a movement record.
 *  - applied: stock change is already on the books. In/out movements skip
 *    pending and start here directly.
 *  - pending: transfer/adjustment awaiting approver action; stock unchanged.
 *  - rejected: approver declined; stock unchanged; record kept for audit.
 */
export type StockMovementStatus = 'applied' | 'pending' | 'rejected'

export interface InventoryItem {
  id: string
  sku: string
  name: string
  description?: string
  categoryId: string
  uomId: string
  warehouseId: string
  quantity: number
  reorderLevel: number
  unitCost?: number
  createdAt: string
}

export interface StockMovement {
  id: string
  itemId: string
  type: StockMovementType
  quantity: number
  sourceLocationId?: string
  destinationLocationId?: string
  reason?: string
  createdAt: string
  createdBy: string
  /** Approval lifecycle. In/out default to 'applied'; transfers/adjustments
   * start as 'pending' and flip to 'applied' or 'rejected' on approver action. */
  status: StockMovementStatus
  /** The approver picked at submission time. Only that user (or any inventory
   * admin) can approve. Required for transfer/adjustment. */
  approverId?: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectedReason?: string
  /** Optional batch/reference numbers — useful on stock in/out paperwork. */
  batchNumber?: string
  referenceNumber?: string
  /** Adjustments only. The user's intended *target* on-hand quantity, captured
   * at submission. At approve time the stored `quantity` (delta) is recomputed
   * as `targetQuantity - currentItemQuantity` so the book lands on the target
   * even if other movements happened between submission and approval. */
  targetQuantity?: number
}

export type CycleCountStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface CycleCountLine {
  itemId: string
  /** Snapshot of item.quantity at the time the session was scheduled.
   * Treated as the "book" value; variance = actualQty - expectedQty. */
  expectedQty: number
  /** Set by the counter while the session is in_progress. Undefined means
   * the line hasn't been counted yet. */
  actualQty?: number
  countedAt?: string
  countedBy?: string
}

export interface CycleCountSession {
  id: string
  warehouseId: string
  /** Optional category filter — if set, lines are restricted to items in
   * that category. Lets you spot-check a slice rather than the whole site. */
  categoryId?: string
  scheduledDate: string
  startedAt?: string
  completedAt?: string
  status: CycleCountStatus
  createdBy: string
  finalizedBy?: string
  lines: CycleCountLine[]
}
