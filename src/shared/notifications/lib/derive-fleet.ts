import { Wrench, Route as RouteIcon } from 'lucide-react'
import { differenceInHours, parseISO } from 'date-fns'
import type { Vehicle, Trip } from '@/features/fleet'
import type { AppNotification } from '@/shared/notifications/types'

const VEHICLE_LINK = (id: string) => `/module/fleet/vehicles?vehicle=${id}`
const TRIP_LINK = (id: string) => `/module/fleet/trips?trip=${id}`

const TRIP_LONG_HOURS = 12
const FLEET_ALERT_LIMIT = 5

/**
 * Derive system-level fleet alerts:
 *  - vehicles currently in maintenance
 *  - trips that have been "in progress" for an unusually long time (forgotten close-out)
 *
 * System-level — anyone with module access sees them. Pure function.
 * Capped at FLEET_ALERT_LIMIT.
 */
export function deriveFleetNotifications(
  vehicles: Vehicle[],
  trips: Trip[],
  /** Reserved for future personal scoping. */
  _userId: string,
  now: Date = new Date(),
): AppNotification[] {
  const out: AppNotification[] = []

  for (const v of vehicles) {
    if (v.status === 'maintenance') {
      out.push({
        id: `vehicle-maint:${v.id}`,
        kind: 'vehicle_in_maintenance',
        severity: 'warning',
        icon: Wrench,
        title: `${v.plateNumber} in maintenance`,
        description: `${v.model} ${v.year} · awaiting repair`,
        timestamp: v.createdAt,
        link: VEHICLE_LINK(v.id),
        module: 'fleet',
      })
    }
  }

  for (const t of trips) {
    if (t.status !== 'in_progress') continue
    const hours = differenceInHours(now, parseISO(t.startTime))
    if (hours < TRIP_LONG_HOURS) continue
    out.push({
      id: `trip-long:${t.id}`,
      kind: 'trip_in_progress_long',
      severity: hours > TRIP_LONG_HOURS * 2 ? 'danger' : 'info',
      icon: RouteIcon,
      title: `Trip ${t.id} running ${hours}h`,
      description: t.purpose ?? 'No close-out yet',
      timestamp: t.startTime,
      link: TRIP_LINK(t.id),
      module: 'fleet',
    })
  }

  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'vehicle_in_maintenance' ? -1 : 1
    return b.timestamp.localeCompare(a.timestamp)
  })

  return out.slice(0, FLEET_ALERT_LIMIT)
}
