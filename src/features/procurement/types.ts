export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type RequestPriority = 'low' | 'normal' | 'urgent'

export interface RequestItem {
  id: string
  requestId: string
  itemId: string
  quantity: number
  unitCost: number
}

export interface RequestApproval {
  approverId: string
  approvedAt: string
  comment?: string
}

export interface ProcurementRequest {
  id: string
  requesterId: string
  departmentId: string
  supplierId?: string
  status: RequestStatus
  notes?: string
  createdAt: string
  /** Sequential approver chain (in order). Empty = single-step legacy mode. */
  approvers?: string[]
  /** Index of the next expected approver. Equals approvers.length when complete. */
  currentApproverIndex?: number
  /** Per-approver signoff records, append-only. */
  approvals?: RequestApproval[]
  /** First approver in the chain (legacy single-approval field — kept for back-compat). */
  approvedBy?: string
  /** Time of final approval. */
  approvedAt?: string
  rejectedReason?: string
  rejectedBy?: string
  rejectedAt?: string
  /** Set when the requester (or admin) withdraws a pending request. */
  cancelledAt?: string
  cancelledBy?: string
  cancelReason?: string
  priority?: RequestPriority
  /** ISO date the requester needs the goods/services by. */
  neededBy?: string
}

export interface RequestWithItems extends ProcurementRequest {
  items: RequestItem[]
  totalAmount: number
}

export const PRIORITY_LABEL: Record<RequestPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  urgent: 'Urgent',
}
