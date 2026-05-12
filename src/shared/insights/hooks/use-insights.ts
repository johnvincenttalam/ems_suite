import { useMemo } from 'react'
import { useInventoryItems, useStockMovements } from '@/features/inventory'
import { useAssets } from '@/features/assets'
import { useRequests } from '@/features/procurement'
import { useWorkOrders } from '@/features/maintenance'
import { usePreventiveSchedules } from '@/features/preventive-maintenance'
import { useVehicles, useFuelLogs, useTrips } from '@/features/fleet'
import type { Insight } from '@/shared/insights/types'
import { SEVERITY_RANK } from '@/shared/insights/types'
import { deriveInventoryInsights } from '@/shared/insights/lib/derive-inventory'
import { deriveMaintenanceInsights } from '@/shared/insights/lib/derive-maintenance'
import { deriveProcurementInsights } from '@/shared/insights/lib/derive-procurement'
import { deriveAssetInsights } from '@/shared/insights/lib/derive-assets'
import { deriveFleetInsights } from '@/shared/insights/lib/derive-fleet'

/**
 * Cross-module insights derived live from the same queries powering the
 * module dashboards. Returns insights sorted by severity (critical first).
 *
 * Pure derivation — nothing is persisted. The list re-computes on every
 * underlying query update; React Query handles the caching.
 */
export function useInsights(): { insights: Insight[]; isLoading: boolean } {
  const { data: items = [], isLoading: itemsL } = useInventoryItems()
  const { data: movements = [] } = useStockMovements()
  const { data: assets = [], isLoading: assetsL } = useAssets()
  const { data: requests = [], isLoading: reqL } = useRequests()
  const { data: workOrders = [], isLoading: woL } = useWorkOrders()
  const { data: schedules = [] } = usePreventiveSchedules()
  const { data: vehicles = [] } = useVehicles()
  const { data: trips = [] } = useTrips()
  const { data: fuelLogs = [] } = useFuelLogs()

  const isLoading = itemsL || assetsL || reqL || woL

  const insights = useMemo<Insight[]>(() => {
    const now = new Date()
    const all = [
      ...deriveInventoryInsights(items, movements, now),
      ...deriveMaintenanceInsights(workOrders, schedules, assets, now),
      ...deriveProcurementInsights(requests, now),
      ...deriveAssetInsights(assets, workOrders),
      ...deriveFleetInsights(vehicles, trips, fuelLogs, now),
    ]
    return all.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  }, [items, movements, assets, requests, workOrders, schedules, vehicles, trips, fuelLogs])

  return { insights, isLoading }
}
