import { CheckCircle2, ClipboardList, ShoppingCart, TriangleAlert, XCircle } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { RequestWithItems } from '@/features/procurement'
import type { AppNotification } from '@/shared/notifications/types'

const PROC_REQ_LINK = (id: string) => `/module/procurement/requests?req=${id}`

/**
 * Derive notifications from procurement requests for `userId`. Pure — same
 * input ⇒ same output. IDs are stable (kind + entity) so toggling read state
 * survives data refresh.
 */
export function deriveProcurementNotifications(
  requests: RequestWithItems[],
  userId: string,
  now: Date = new Date(),
): AppNotification[] {
  const out: AppNotification[] = []

  for (const r of requests) {
    if (r.status === 'pending') {
      const idx = r.currentApproverIndex ?? 0
      const next = r.approvers?.[idx]
      if (next === userId) {
        out.push({
          id: `req-approve:${r.id}`,
          kind: 'approval_needed',
          severity: r.priority === 'urgent' ? 'danger' : 'warning',
          icon: ClipboardList,
          title: `${r.id} awaits your approval`,
          description: r.notes ?? `${r.items.length} line${r.items.length === 1 ? '' : 's'}`,
          timestamp: r.createdAt,
          link: PROC_REQ_LINK(r.id),
          module: 'procurement',
        })
      }
    }

    if (r.requesterId === userId && r.status === 'approved' && r.approvedAt) {
      out.push({
        id: `req-approved:${r.id}`,
        kind: 'request_approved',
        severity: 'success',
        icon: CheckCircle2,
        title: `${r.id} approved`,
        description: r.notes ?? 'Your request cleared the approval chain',
        timestamp: r.approvedAt,
        link: PROC_REQ_LINK(r.id),
        module: 'procurement',
      })
    }

    if (r.requesterId === userId && r.status === 'rejected') {
      out.push({
        id: `req-rejected:${r.id}`,
        kind: 'request_rejected',
        severity: 'danger',
        icon: XCircle,
        title: `${r.id} rejected`,
        description: r.rejectedReason ?? 'See approver comment',
        timestamp: r.rejectedAt ?? r.createdAt,
        link: PROC_REQ_LINK(r.id),
        module: 'procurement',
      })
    }

    if (r.status === 'pending' && r.neededBy) {
      const days = differenceInCalendarDays(parseISO(r.neededBy), now)
      const idx = r.currentApproverIndex ?? 0
      const isApprover = r.approvers?.[idx] === userId
      const isRequester = r.requesterId === userId
      if ((isApprover || isRequester) && days < 0) {
        out.push({
          id: `req-overdue:${r.id}`,
          kind: 'request_overdue',
          severity: 'danger',
          icon: TriangleAlert,
          title: `${r.id} is overdue`,
          description: `Needed by ${r.neededBy} (${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago)`,
          timestamp: r.neededBy,
          link: PROC_REQ_LINK(r.id),
          module: 'procurement',
        })
      }
    }
  }

  return out
}

// Re-export for icon variety in surface layers
export { ShoppingCart }
