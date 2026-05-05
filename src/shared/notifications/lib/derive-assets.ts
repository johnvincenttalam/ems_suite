import { Wrench, UserCheck } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Asset, AssetAssignment } from '@/features/assets'
import type { AppNotification } from '@/shared/notifications/types'

const ASSET_LINK = (id: string) => `/module/assets/registry?asset=${id}`

const ASSIGNMENT_OVERDUE_DAYS = 30
const ASSET_ALERT_LIMIT = 5

/**
 * Derive system-level asset alerts:
 *  - assets currently in maintenance
 *  - open assignments older than ASSIGNMENT_OVERDUE_DAYS (long-running checkouts)
 *
 * System-level — anyone with module access sees them. Pure function.
 * Capped at ASSET_ALERT_LIMIT so a fleet of 100+ in-maintenance items
 * doesn't drown the bell.
 */
export function deriveAssetNotifications(
  assets: Asset[],
  assignments: AssetAssignment[],
  /** Reserved for future personal scoping. */
  _userId: string,
  now: Date = new Date(),
): AppNotification[] {
  const out: AppNotification[] = []

  for (const a of assets) {
    if (a.status === 'maintenance') {
      out.push({
        id: `asset-maint:${a.id}`,
        kind: 'asset_in_maintenance',
        severity: 'warning',
        icon: Wrench,
        title: `${a.name} in maintenance`,
        description: `${a.serialNumber} · awaiting work-order completion`,
        timestamp: a.createdAt,
        link: ASSET_LINK(a.id),
        module: 'assets',
      })
    }
  }

  for (const ass of assignments) {
    if (ass.returnedDate) continue
    const days = differenceInCalendarDays(now, parseISO(ass.assignedDate))
    if (days < ASSIGNMENT_OVERDUE_DAYS) continue
    const asset = assets.find((a) => a.id === ass.assetId)
    out.push({
      id: `asset-assign:${ass.id}`,
      kind: 'asset_assignment_open',
      severity: days > ASSIGNMENT_OVERDUE_DAYS * 2 ? 'danger' : 'info',
      icon: UserCheck,
      title: `${asset?.name ?? ass.assetId} checked out ${days} days`,
      description: `Assigned ${ass.assignedDate} · still open`,
      timestamp: ass.assignedDate,
      link: asset ? ASSET_LINK(asset.id) : '/module/assets/assignments',
      module: 'assets',
    })
  }

  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'asset_in_maintenance' ? -1 : 1
    return b.timestamp.localeCompare(a.timestamp)
  })

  return out.slice(0, ASSET_ALERT_LIMIT)
}
