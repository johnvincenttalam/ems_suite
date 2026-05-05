import { useMemo } from 'react'
import { useInventoryItems, useStockMovements } from '@/features/inventory'
import { useAssets } from '@/features/assets'
import { useRequests } from '@/features/procurement'
import { useWorkOrders } from '@/features/maintenance'
import { useDocuments } from '@/features/documents'
import { useFuelLogs, useTrips } from '@/features/fleet'
import { useTrackingLogs } from '@/features/tracking'
import { useAssignments } from '@/features/checklists'
import { groupByMonth, groupByWeek, monthLabel, sumBy, countBy, topN, pct, monthKey, weekKey } from '@/features/reports/utils/aggregate'

export function useReportsData() {
  const { data: items = [], isLoading: itemsLoading } = useInventoryItems()
  const { data: movements = [] } = useStockMovements()
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: requests = [], isLoading: requestsLoading } = useRequests()
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders()
  const { data: documents = [] } = useDocuments()
  const { data: fuelLogs = [] } = useFuelLogs()
  const { data: trips = [] } = useTrips()
  const { data: scans = [] } = useTrackingLogs()
  const { data: checklistAssignments = [] } = useAssignments()

  const isLoading = itemsLoading || assetsLoading || requestsLoading || woLoading

  return useMemo(() => {
    // KPI tiles
    const lowStockCount = items.filter((i) => i.quantity <= i.reorderLevel).length
    const inventoryValue = sumBy(items, (i) => i.quantity * (i.unitCost ?? 0))
    const activeAssets = assets.filter((a) => a.status === 'active').length
    const assetsInMaintenance = assets.filter((a) => a.status === 'maintenance').length
    const pendingRequests = requests.filter((r) => r.status === 'pending').length
    const monthSpend = sumBy(
      requests.filter((r) => r.status === 'approved'),
      (r) => r.totalAmount,
    )
    const overdueWorkOrders = workOrders.filter((w) => {
      if (w.status === 'completed') return false
      return w.scheduledDate < new Date().toISOString().slice(0, 10)
    }).length
    const docsInReview = documents.filter((d) => d.status === 'in_review').length
    const tripsInProgress = trips.filter((t) => t.status === 'in_progress').length

    // Top-5 low-stock items
    const lowStockItems = topN(
      items.filter((i) => i.quantity <= i.reorderLevel),
      5,
      (a, b) => (a.quantity - a.reorderLevel) - (b.quantity - b.reorderLevel),
    )

    // Asset status breakdown
    const assetStatusBreakdown = Object.entries(countBy(assets, (a) => a.status))
      .map(([name, value]) => ({ name, value }))

    // Monthly procurement spend (approved only)
    const monthlySpend = groupByMonth(requests.filter((r) => r.status === 'approved'), (r) => r.createdAt)
      .map(({ key, items }) => ({
        month: monthLabel(key),
        spend: sumBy(items, (r) => r.totalAmount),
      }))

    // Monthly maintenance completion rate
    const maintenanceByMonth = groupByMonth(workOrders, (w) => w.scheduledDate)
      .map(({ key, items }) => {
        const total = items.length
        const completed = items.filter((w) => w.status === 'completed').length
        return { month: monthLabel(key), rate: pct(completed, total), total, completed }
      })

    // Weekly fuel cost
    const weeklyFuel = groupByWeek(fuelLogs, (l) => l.date)
      .map(({ key, items }) => ({
        week: key.slice(-3), // 'W17'
        cost: Math.round(sumBy(items, (l) => l.totalCost)),
        liters: Math.round(sumBy(items, (l) => l.liters)),
      }))

    // Procurement status funnel
    const procurementFunnel = [
      { stage: 'Total', count: requests.length },
      { stage: 'Approved', count: requests.filter((r) => r.status === 'approved').length },
      { stage: 'Pending', count: requests.filter((r) => r.status === 'pending').length },
      { stage: 'Rejected', count: requests.filter((r) => r.status === 'rejected').length },
    ]

    // Daily scan volume (last 14 days)
    const today = new Date().toISOString().slice(0, 10)
    const days: { day: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const count = scans.filter((s) => s.timestamp.slice(0, 10) === iso).length
      days.push({ day: iso.slice(5), count })
    }

    // Stock movement breakdown by type (this month)
    const thisMonth = monthKey(new Date().toISOString())
    const monthMovements = movements.filter((m) => monthKey(m.createdAt) === thisMonth)
    const movementsByType = Object.entries(countBy(monthMovements, (m) => m.type))
      .map(([name, value]) => ({ name, value }))

    // Checklist completion rate (last 30d)
    const checklistsCompletedRate = pct(
      checklistAssignments.filter((a) => a.status === 'completed').length,
      checklistAssignments.length,
    )

    return {
      isLoading,
      kpis: {
        lowStockCount,
        inventoryValue,
        activeAssets,
        assetsInMaintenance,
        pendingRequests,
        monthSpend,
        overdueWorkOrders,
        docsInReview,
        tripsInProgress,
        checklistsCompletedRate,
      },
      lowStockItems,
      assetStatusBreakdown,
      monthlySpend,
      maintenanceByMonth,
      weeklyFuel,
      procurementFunnel,
      dailyScans: days,
      movementsByType,
    }
  }, [items, movements, assets, requests, workOrders, documents, fuelLogs, trips, scans, checklistAssignments, isLoading])
}

export { weekKey }
