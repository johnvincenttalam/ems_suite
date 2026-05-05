export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject'

export interface AuditEntry {
  id: string
  userId: string
  userName: string
  action: AuditAction
  module: string
  detail: string
  timestamp: string
}
