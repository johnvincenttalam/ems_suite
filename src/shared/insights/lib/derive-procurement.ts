import { startOfMonth, subMonths, parseISO, isAfter } from 'date-fns'
import type { RequestWithItems } from '@/features/procurement'
import type { Insight } from '@/shared/insights/types'

const PCT_THRESHOLD = 10

function pctChange(now: number, prior: number): number | null {
  if (prior === 0) return null
  return Math.round(((now - prior) / prior) * 100)
}

/** Procurement insights — pending workload, spend trajectory. */
export function deriveProcurementInsights(
  requests: RequestWithItems[],
  now: Date = new Date(),
): Insight[] {
  const insights: Insight[] = []

  const pending = requests.filter((r) => r.status === 'pending')
  if (pending.length > 0) {
    insights.push({
      id: 'proc:pending',
      message: `${pending.length} request${pending.length === 1 ? '' : 's'} awaiting approval`,
      severity: pending.length >= 10 ? 'warning' : 'info',
      module: 'procurement',
      metric: `${pending.length}`,
      href: '/module/procurement/approvals',
    })
  }

  // Approved spend MTD vs prior month.
  const monthStart = startOfMonth(now)
  const priorMonthStart = startOfMonth(subMonths(now, 1))
  let spendMTD = 0
  let spendPrior = 0
  for (const r of requests) {
    if (r.status !== 'approved' || !r.approvedAt) continue
    const at = parseISO(r.approvedAt)
    if (isAfter(at, monthStart)) spendMTD += r.totalAmount
    else if (isAfter(at, priorMonthStart)) spendPrior += r.totalAmount
  }
  const delta = pctChange(spendMTD, spendPrior)
  if (delta !== null && Math.abs(delta) >= PCT_THRESHOLD) {
    insights.push({
      id: 'proc:spend-delta',
      message:
        delta > 0
          ? `Procurement spend up ${delta}% vs last month`
          : `Procurement spend down ${Math.abs(delta)}% vs last month`,
      severity: delta > 0 ? 'warning' : 'info',
      module: 'procurement',
      metric: `${delta > 0 ? '+' : ''}${delta}%`,
      href: '/module/procurement/reports',
    })
  }

  return insights
}
