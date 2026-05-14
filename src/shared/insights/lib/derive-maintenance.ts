import { startOfMonth, subMonths, parseISO, isAfter, format } from 'date-fns'
import type { WorkOrder } from '@/features/maintenance'
import { workOrderTotalCost } from '@/features/maintenance'
import type { PreventiveSchedule } from '@/features/preventive-maintenance'
import { isUsageInterval } from '@/features/preventive-maintenance'
import type { Asset } from '@/features/assets'
import type { Insight } from '@/shared/insights/types'

const PCT_THRESHOLD = 10

function pctChange(now: number, prior: number): number | null {
  if (prior === 0) return null
  return Math.round(((now - prior) / prior) * 100)
}

/**
 * Maintenance insights — overdue WOs, MTD cost vs prior, PM schedules
 * actually due (time- or usage-based).
 */
export function deriveMaintenanceInsights(
  workOrders: WorkOrder[],
  schedules: PreventiveSchedule[],
  assets: Asset[],
  now: Date = new Date(),
): Insight[] {
  const insights: Insight[] = []
  const today = format(now, 'yyyy-MM-dd')

  // Overdue work orders.
  const overdue = workOrders.filter(
    (w) => (w.status === 'pending' || w.status === 'ongoing') && w.scheduledDate < today,
  )
  if (overdue.length > 0) {
    insights.push({
      id: 'wo:overdue',
      message: `${overdue.length} work order${overdue.length === 1 ? '' : 's'} overdue`,
      severity: overdue.length >= 5 ? 'critical' : 'warning',
      module: 'maintenance',
      metric: `${overdue.length}`,
      href: '/module/maintenance/work-orders',
    })
  }

  // Maintenance cost MTD vs prior month.
  const monthStart = startOfMonth(now)
  const priorMonthStart = startOfMonth(subMonths(now, 1))
  let costMTD = 0
  let costPrior = 0
  for (const w of workOrders) {
    if (w.status !== 'completed' || !w.completedDate) continue
    const completed = parseISO(w.completedDate)
    const cost = workOrderTotalCost(w)
    if (isAfter(completed, monthStart)) costMTD += cost
    else if (isAfter(completed, priorMonthStart)) costPrior += cost
  }
  const delta = pctChange(costMTD, costPrior)
  if (delta !== null && Math.abs(delta) >= PCT_THRESHOLD) {
    insights.push({
      id: 'wo:cost-delta',
      message:
        delta > 0
          ? `Maintenance cost up ${delta}% vs last month`
          : `Maintenance cost down ${Math.abs(delta)}% vs last month`,
      severity: delta > 0 ? 'warning' : 'info',
      module: 'maintenance',
      metric: `${delta > 0 ? '+' : ''}${delta}%`,
      href: '/module/maintenance/reports',
    })
  }

  // PM schedules currently due — time- or usage-based.
  const assetById = new Map(assets.map((a) => [a.id, a]))
  const dueSchedules = schedules.filter((s) => {
    if (s.status !== 'active') return false
    if (isUsageInterval(s.intervalUnit)) {
      const asset = s.assetId ? assetById.get(s.assetId) : undefined
      if (!asset || asset.currentMeter === undefined || s.lastServiceMeter === undefined) return false
      return asset.currentMeter >= s.lastServiceMeter + s.intervalValue
    }
    return s.nextServiceDate <= today
  })
  if (dueSchedules.length > 0) {
    insights.push({
      id: 'pm:due',
      message: `${dueSchedules.length} preventive schedule${dueSchedules.length === 1 ? ' is' : 's are'} due`,
      severity: 'warning',
      module: 'maintenance',
      metric: `${dueSchedules.length}`,
      href: '/module/maintenance/preventive',
    })
  }

  return insights
}
