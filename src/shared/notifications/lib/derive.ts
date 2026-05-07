import { CheckCircle2, Clock, GitBranch, PenLine, Route as RouteIcon, TriangleAlert, XCircle } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { AppDocument } from '@/features/documents'
import type { AppNotification } from '@/shared/notifications/types'

const SDMS_DOC_LINK = (id: string) => `/module/sdms/documents/${id}`

/**
 * Derive notifications for `userId` from the current `documents` array.
 *
 * Pure — same input ⇒ same output. Time-relative computations use `now`
 * (default `new Date()`) so tests can pin them.
 *
 * IDs are stable (kind + entity), so toggling read-state survives refreshes
 * and re-renders without needing a notifications backend.
 */
export function deriveDocumentNotifications(
  documents: AppDocument[],
  userId: string,
  now: Date = new Date(),
): AppNotification[] {
  const out: AppNotification[] = []

  for (const doc of documents) {
    if (
      doc.status === 'in_review' &&
      doc.approvers[doc.currentApproverIndex ?? 0] === userId
    ) {
      out.push({
        id: `sign:${doc.id}`,
        kind: 'sign_required',
        severity: 'warning',
        icon: PenLine,
        title: `${doc.title} awaits your signature`,
        description: `${doc.trackingNumber ?? doc.id} · step ${(doc.currentApproverIndex ?? 0) + 1}/${doc.approvers.length}`,
        timestamp: doc.createdAt,
        link: SDMS_DOC_LINK(doc.id),
        module: 'sdms',
      })
    }

    for (const r of doc.routings ?? []) {
      if (r.recipientId === userId && r.status !== 'completed') {
        out.push({
          id: `route:${doc.id}:${r.id}`,
          kind: 'routing_pending',
          severity: r.purpose === 'approval' ? 'warning' : 'info',
          icon: RouteIcon,
          title: `Routed to you for ${r.purpose}`,
          description: `${doc.trackingNumber ?? doc.id} — ${doc.title}`,
          timestamp: r.routedAt,
          link: SDMS_DOC_LINK(doc.id),
          module: 'sdms',
        })
      }
    }

    if (doc.createdBy === userId && doc.status === 'approved') {
      const lastSig = doc.signatures[doc.signatures.length - 1]
      out.push({
        id: `approved:${doc.id}`,
        kind: 'doc_approved',
        severity: 'success',
        icon: CheckCircle2,
        title: `${doc.title} approved`,
        description: `${doc.trackingNumber ?? doc.id} cleared all ${doc.approvers.length} approver${doc.approvers.length === 1 ? '' : 's'}`,
        timestamp: lastSig?.signedAt ?? doc.createdAt,
        link: SDMS_DOC_LINK(doc.id),
        module: 'sdms',
      })
    }

    if (doc.createdBy === userId && doc.status === 'rejected') {
      out.push({
        id: `rejected:${doc.id}`,
        kind: 'doc_rejected',
        severity: 'danger',
        icon: XCircle,
        title: `${doc.title} disapproved`,
        description: doc.rejectedReason ?? 'Please review and revise',
        timestamp: doc.rejectedAt ?? doc.createdAt,
        link: SDMS_DOC_LINK(doc.id),
        module: 'sdms',
      })
    }

    if (doc.status === 'in_review' && doc.deadline) {
      const days = differenceInCalendarDays(parseISO(doc.deadline), now)
      const youAreApprover = doc.approvers.includes(userId)
      const youAreAuthor = doc.createdBy === userId
      if (youAreApprover || youAreAuthor) {
        if (days < 0) {
          out.push({
            id: `overdue:${doc.id}`,
            kind: 'deadline_overdue',
            severity: 'danger',
            icon: TriangleAlert,
            title: `${doc.title} is overdue`,
            description: `Deadline was ${doc.deadline} (${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago)`,
            timestamp: doc.deadline,
            link: SDMS_DOC_LINK(doc.id),
            module: 'sdms',
          })
        } else if (days <= 2) {
          out.push({
            id: `soon:${doc.id}`,
            kind: 'deadline_soon',
            severity: 'warning',
            icon: Clock,
            title: `${doc.title} due ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
            description: `${doc.trackingNumber ?? doc.id}`,
            timestamp: doc.deadline,
            link: SDMS_DOC_LINK(doc.id),
            module: 'sdms',
          })
        }
      }
    }
  }

  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

// Re-export GitBranch for places that want a generic doc icon
export { GitBranch }
