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
}
