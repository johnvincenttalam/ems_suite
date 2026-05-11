export type POStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'completed'
  | 'cancelled'

export interface POItem {
  id: string
  poId: string
  itemId: string
  quantity: number
  unitCost: number
  /** Quantity received so far (driven by GRN later — 0 for now). */
  receivedQty: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  /** The requisition that justified this PO (always required — POs flow from approved requests). */
  requisitionId: string
  status: POStatus
  notes?: string
  createdAt: string
  createdBy: string
  /** Set when status flips from draft to ordered. */
  sentAt?: string
  /** Optional expected delivery date set at PO creation. */
  expectedDeliveryDate?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelReason?: string
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: POItem[]
  totalAmount: number
}

export const PO_STATUS_LABEL: Record<POStatus, string> = {
  draft: 'Draft',
  ordered: 'Ordered',
  partially_received: 'Partially Received',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
