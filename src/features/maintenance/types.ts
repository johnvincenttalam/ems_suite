export type WorkOrderStatus = 'pending' | 'ongoing' | 'completed'
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical'

export interface WorkOrder {
  id: string
  assetId: string
  title: string
  description?: string
  priority: WorkOrderPriority
  assignedTo: string
  status: WorkOrderStatus
  scheduledDate: string
  completedDate?: string
  checklistId?: string
  createdAt: string
  createdBy: string
}
