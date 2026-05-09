import { AlertCircle, AlertTriangle, UserCheck } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Issue } from '@/features/issues'
import type { AppNotification } from '@/shared/notifications/types'

const ISSUE_ALERT_LIMIT = 8
const STALE_OPEN_DAYS = 7

const ISSUE_LINK = (issue: Issue): string =>
  issue.target.kind === 'vehicle'
    ? `/module/fleet/issues?issue=${issue.id}`
    : `/module/assets/issues?issue=${issue.id}`

const ISSUE_MODULE = (issue: Issue): 'fleet' | 'assets' =>
  issue.target.kind === 'vehicle' ? 'fleet' : 'assets'

/**
 * Derive notifications from the current Issues set:
 *   - critical issues that are still open / monitor / in_progress
 *   - issues assigned to the current user that aren't done
 *   - non-critical open issues older than 7 days (stale)
 *
 * Pure — same input ⇒ same output. IDs are stable so notification read-state
 * survives re-renders.
 */
export function deriveIssueNotifications(
  issues: Issue[],
  userId: string,
  now: Date = new Date(),
): AppNotification[] {
  const out: AppNotification[] = []

  for (const issue of issues) {
    if (issue.status === 'resolved' || issue.status === 'closed') continue

    if (issue.severity === 'critical') {
      out.push({
        id: `issue-critical:${issue.id}`,
        kind: 'issue_critical_open',
        severity: 'danger',
        icon: AlertTriangle,
        title: `Critical: ${issue.title}`,
        description: `${issue.id} · ${issue.target.kind} ${issue.target.id} · ${issue.status.replace('_', ' ')}`,
        timestamp: issue.reportedAt,
        link: ISSUE_LINK(issue),
        module: ISSUE_MODULE(issue),
      })
      continue
    }

    if (issue.assignedToUserId === userId) {
      out.push({
        id: `issue-assigned:${issue.id}`,
        kind: 'issue_assigned',
        severity: 'warning',
        icon: UserCheck,
        title: `Assigned: ${issue.title}`,
        description: `${issue.id} · ${issue.severity} · ${issue.status.replace('_', ' ')}`,
        timestamp: issue.updatedAt,
        link: ISSUE_LINK(issue),
        module: ISSUE_MODULE(issue),
      })
      continue
    }

    const days = differenceInCalendarDays(now, parseISO(issue.reportedAt))
    if (issue.status === 'open' && days >= STALE_OPEN_DAYS) {
      out.push({
        id: `issue-stale:${issue.id}`,
        kind: 'issue_stale',
        severity: 'info',
        icon: AlertCircle,
        title: `${issue.title} — open ${days}d`,
        description: `${issue.id} · awaiting triage`,
        timestamp: issue.reportedAt,
        link: ISSUE_LINK(issue),
        module: ISSUE_MODULE(issue),
      })
    }
  }

  out.sort((a, b) => {
    const sevOrder: Record<string, number> = { danger: 0, warning: 1, info: 2, success: 3 }
    if (a.severity !== b.severity) return (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9)
    return b.timestamp.localeCompare(a.timestamp)
  })

  return out.slice(0, ISSUE_ALERT_LIMIT)
}
