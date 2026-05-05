import { Clock, TriangleAlert, Wrench } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { WorkOrder } from '@/features/maintenance'
import type { AppNotification } from '@/shared/notifications/types'

const MAINT_LINK = (id: string) => `/module/maintenance/work-orders?wo=${id}`

const SOON_THRESHOLD_DAYS = 2

/**
 * Derive notifications from open work orders for `userId`. User-personal —
 * only emits when the work order is assigned to this user. Pure function;
 * `now` defaults to the current time but can be pinned for tests.
 */
export function deriveMaintenanceNotifications(
  workOrders: WorkOrder[],
  userId: string,
  now: Date = new Date(),
): AppNotification[] {
  const out: AppNotification[] = []
  const today = now.toISOString().slice(0, 10)

  for (const wo of workOrders) {
    if (wo.assignedTo !== userId) continue
    if (wo.status === 'completed') continue

    const days = differenceInCalendarDays(parseISO(wo.scheduledDate), parseISO(today))

    if (days < 0) {
      out.push({
        id: `wo-overdue:${wo.id}`,
        kind: 'wo_overdue',
        severity: 'danger',
        icon: TriangleAlert,
        title: `${wo.title} is overdue`,
        description: `${wo.id} · scheduled ${wo.scheduledDate} (${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago)`,
        timestamp: wo.scheduledDate,
        link: MAINT_LINK(wo.id),
        module: 'maintenance',
      })
    } else if (days <= SOON_THRESHOLD_DAYS) {
      out.push({
        id: `wo-soon:${wo.id}`,
        kind: 'wo_due_soon',
        severity: wo.priority === 'critical' ? 'danger' : 'warning',
        icon: Clock,
        title: `${wo.title} due ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
        description: `${wo.id} · ${wo.priority} priority`,
        timestamp: wo.scheduledDate,
        link: MAINT_LINK(wo.id),
        module: 'maintenance',
      })
    } else if (wo.status === 'pending') {
      out.push({
        id: `wo-assigned:${wo.id}`,
        kind: 'wo_assigned',
        severity: 'info',
        icon: Wrench,
        title: `Assigned: ${wo.title}`,
        description: `${wo.id} · scheduled ${wo.scheduledDate}`,
        timestamp: wo.createdAt,
        link: MAINT_LINK(wo.id),
        module: 'maintenance',
      })
    }
  }

  return out
}
