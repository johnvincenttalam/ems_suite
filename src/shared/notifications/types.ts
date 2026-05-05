import type { LucideIcon } from 'lucide-react'
import type { ModuleKey } from '@/config/modules'

export type NotificationKind =
  | 'sign_required'
  | 'routing_pending'
  | 'doc_approved'
  | 'doc_rejected'
  | 'deadline_soon'
  | 'deadline_overdue'
  | 'approval_needed'
  | 'request_approved'
  | 'request_rejected'
  | 'request_overdue'
  | 'wo_assigned'
  | 'wo_due_soon'
  | 'wo_overdue'
  | 'low_stock'
  | 'stock_out'
  | 'asset_in_maintenance'
  | 'asset_assignment_open'
  | 'vehicle_in_maintenance'
  | 'trip_in_progress_long'

export type NotificationSeverity = 'info' | 'warning' | 'success' | 'danger'

export interface AppNotification {
  /** Stable id derived from kind + entity ids — re-deriving the same trigger
   * yields the same id so read-state survives data refreshes. */
  id: string
  kind: NotificationKind
  severity: NotificationSeverity
  icon: LucideIcon
  title: string
  description: string
  /** ISO timestamp used for sort + relative formatting. */
  timestamp: string
  /** Optional intra-app link (path + optional query). Click navigates here. */
  link?: string
  /** Owning module — used to scope the bell to the active workspace. */
  module: ModuleKey
}
