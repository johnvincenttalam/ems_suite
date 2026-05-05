import { useMemo } from 'react'
import { useDocuments } from '@/features/documents'
import { useRequests } from '@/features/procurement'
import { useWorkOrders } from '@/features/maintenance'
import { useInventoryItems } from '@/features/inventory'
import { useAssets, useAssetAssignments } from '@/features/assets'
import { useVehicles, useTrips } from '@/features/fleet'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { deriveDocumentNotifications } from '@/shared/notifications/lib/derive'
import { deriveProcurementNotifications } from '@/shared/notifications/lib/derive-procurement'
import { deriveMaintenanceNotifications } from '@/shared/notifications/lib/derive-maintenance'
import { deriveInventoryNotifications } from '@/shared/notifications/lib/derive-inventory'
import { deriveAssetNotifications } from '@/shared/notifications/lib/derive-assets'
import { deriveFleetNotifications } from '@/shared/notifications/lib/derive-fleet'
import { useNotificationReadStore } from '@/shared/notifications/store/notification-read-store'
import type { AppNotification } from '@/shared/notifications/types'
import type { ModuleKey } from '@/config/modules'

interface UseNotificationsResult {
  notifications: (AppNotification & { read: boolean })[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
}

/** MIS shows every module's notifications (cross-module super-console). */
const GLOBAL_MODULES: ReadonlySet<ModuleKey> = new Set<ModuleKey>(['mis'])

export function useNotifications(moduleKey?: ModuleKey): UseNotificationsResult {
  const { data: documents = [] } = useDocuments()
  const { data: requests = [] } = useRequests()
  const { data: workOrders = [] } = useWorkOrders()
  const { data: inventoryItems = [] } = useInventoryItems()
  const { data: assets = [] } = useAssets()
  const { data: assetAssignments = [] } = useAssetAssignments()
  const { data: vehicles = [] } = useVehicles()
  const { data: trips = [] } = useTrips()
  const { user } = useAuthStore()
  const readIds = useNotificationReadStore((s) => s.readIds)
  const markRead = useNotificationReadStore((s) => s.markRead)
  const markAllReadFn = useNotificationReadStore((s) => s.markAllRead)

  const notifications = useMemo(() => {
    if (!user) return []
    const fromDocs = deriveDocumentNotifications(documents, user.id)
    const fromProc = deriveProcurementNotifications(requests, user.id)
    const fromMaint = deriveMaintenanceNotifications(workOrders, user.id)
    const fromInv = deriveInventoryNotifications(inventoryItems, user.id)
    const fromAssets = deriveAssetNotifications(assets, assetAssignments, user.id)
    const fromFleet = deriveFleetNotifications(vehicles, trips, user.id)
    const all = [...fromDocs, ...fromProc, ...fromMaint, ...fromInv, ...fromAssets, ...fromFleet].sort(
      (a, b) => b.timestamp.localeCompare(a.timestamp),
    )
    const scoped = moduleKey && !GLOBAL_MODULES.has(moduleKey)
      ? all.filter((n) => n.module === moduleKey)
      : all
    return scoped.map((n) => ({ ...n, read: readIds.has(n.id) }))
  }, [documents, requests, workOrders, inventoryItems, assets, assetAssignments, vehicles, trips, user, readIds, moduleKey])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead: () => markAllReadFn(notifications.map((n) => n.id)),
  }
}
