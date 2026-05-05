export type AssignmentStatus = 'pending' | 'in_progress' | 'completed'

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  description?: string
  items: ChecklistItem[]
  createdAt: string
  createdBy: string
}

export interface ChecklistResultItem {
  itemId: string
  completed: boolean
  notes?: string
}

export interface ChecklistAssignment {
  id: string
  templateId: string
  assignedTo: string
  assignedDate: string
  dueDate?: string
  status: AssignmentStatus
  completedAt?: string
  completedBy?: string
  results: ChecklistResultItem[]
  notes?: string
}
