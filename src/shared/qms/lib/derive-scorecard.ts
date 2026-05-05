import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { WorkOrder } from '@/features/maintenance'
import type { RequestWithItems } from '@/features/procurement'
import type { AppDocument } from '@/features/documents'
import type { InventoryItem } from '@/features/inventory'
import type { Vehicle } from '@/features/fleet'

export type KpiModule = 'maintenance' | 'procurement' | 'sdms' | 'inventory' | 'fleet'
export type KpiStatus = 'pass' | 'warn' | 'fail'
export type KpiComparator = 'gte' | 'lte'

export interface ScorecardKpi {
  id: string
  module: KpiModule
  label: string
  value: number
  unit: string
  target: number
  comparator: KpiComparator
  status: KpiStatus
}

export interface QualityScorecard {
  kpis: ScorecardKpi[]
  /** Overall pass rate across all KPIs (0–1). */
  overall: number
  /** Status breakdown for the donut. */
  breakdown: { pass: number; warn: number; fail: number }
}

/**
 * Compute KPI status given a target, comparator, and value.
 *
 * For gte: pass if value ≥ target, warn within 10% below, fail otherwise.
 * For lte: pass if value ≤ target, warn within 10% above, fail otherwise.
 */
function statusOf(value: number, target: number, comparator: KpiComparator): KpiStatus {
  if (comparator === 'gte') {
    if (value >= target) return 'pass'
    if (value >= target * 0.9) return 'warn'
    return 'fail'
  }
  if (value <= target) return 'pass'
  if (value <= target * 1.1) return 'warn'
  return 'fail'
}

interface ScorecardInputs {
  workOrders: WorkOrder[]
  requests: RequestWithItems[]
  documents: AppDocument[]
  items: InventoryItem[]
  vehicles: Vehicle[]
  now?: Date
}

/**
 * Derive a cross-module quality scorecard from operational data. Pure — same
 * input ⇒ same output. Each KPI has a target + comparator + computed status,
 * so the renderer is just a presentational concern.
 */
export function deriveQualityScorecard({
  workOrders,
  requests,
  documents,
  items,
  vehicles,
  now = new Date(),
}: ScorecardInputs): QualityScorecard {
  const kpis: ScorecardKpi[] = []

  // ── Maintenance
  const closedWOs = workOrders.filter((w) => w.status === 'completed' && w.completedDate)
  const onTimeWOs = closedWOs.filter(
    (w) => differenceInCalendarDays(parseISO(w.completedDate as string), parseISO(w.scheduledDate)) <= 0,
  )
  const pmRate = closedWOs.length === 0 ? 100 : Math.round((onTimeWOs.length / closedWOs.length) * 100)
  kpis.push({
    id: 'pm-on-time',
    module: 'maintenance',
    label: 'PM On-time Completion',
    value: pmRate,
    unit: '%',
    target: 90,
    comparator: 'gte',
    status: statusOf(pmRate, 90, 'gte'),
  })

  const openWOs = workOrders.filter((w) => w.status !== 'completed')
  const overdueWOs = openWOs.filter(
    (w) => differenceInCalendarDays(parseISO(w.scheduledDate), now) < 0,
  )
  const overdueRate = openWOs.length === 0 ? 0 : Math.round((overdueWOs.length / openWOs.length) * 100)
  kpis.push({
    id: 'wo-overdue',
    module: 'maintenance',
    label: 'WO Overdue Rate',
    value: overdueRate,
    unit: '%',
    target: 5,
    comparator: 'lte',
    status: statusOf(overdueRate, 5, 'lte'),
  })

  // ── Procurement
  const approvedRequests = requests.filter((r) => r.status === 'approved' && r.approvedAt)
  const cycleDays = approvedRequests.length === 0
    ? 0
    : approvedRequests.reduce(
        (s, r) => s + differenceInCalendarDays(parseISO(r.approvedAt as string), parseISO(r.createdAt)),
        0,
      ) / approvedRequests.length
  kpis.push({
    id: 'req-cycle',
    module: 'procurement',
    label: 'Approval Cycle Time',
    value: Math.round(cycleDays * 10) / 10,
    unit: ' days',
    target: 3,
    comparator: 'lte',
    status: statusOf(cycleDays, 3, 'lte'),
  })

  const totalDecided = requests.filter((r) => r.status !== 'pending').length
  const rejectedReqs = requests.filter((r) => r.status === 'rejected').length
  const reqRejectRate = totalDecided === 0 ? 0 : Math.round((rejectedReqs / totalDecided) * 100)
  kpis.push({
    id: 'req-reject',
    module: 'procurement',
    label: 'Request Rejection Rate',
    value: reqRejectRate,
    unit: '%',
    target: 10,
    comparator: 'lte',
    status: statusOf(reqRejectRate, 10, 'lte'),
  })

  // ── SDMS
  const approvedDocs = documents.filter((d) => d.status === 'approved' && d.signatures.length > 0)
  const docCycle = approvedDocs.length === 0
    ? 0
    : approvedDocs.reduce((s, d) => {
        const last = d.signatures[d.signatures.length - 1]
        return s + differenceInCalendarDays(parseISO(last.signedAt), parseISO(d.createdAt))
      }, 0) / approvedDocs.length
  kpis.push({
    id: 'doc-cycle',
    module: 'sdms',
    label: 'Doc Approval Cycle',
    value: Math.round(docCycle * 10) / 10,
    unit: ' days',
    target: 5,
    comparator: 'lte',
    status: statusOf(docCycle, 5, 'lte'),
  })

  const decidedDocs = documents.filter((d) => d.status === 'approved' || d.status === 'rejected')
  const rejectedDocs = documents.filter((d) => d.status === 'rejected').length
  const docRejectRate = decidedDocs.length === 0 ? 0 : Math.round((rejectedDocs / decidedDocs.length) * 100)
  kpis.push({
    id: 'doc-reject',
    module: 'sdms',
    label: 'Doc Rejection Rate',
    value: docRejectRate,
    unit: '%',
    target: 5,
    comparator: 'lte',
    status: statusOf(docRejectRate, 5, 'lte'),
  })

  // ── Inventory
  const stockOuts = items.filter((i) => i.quantity === 0).length
  const stockOutRate = items.length === 0 ? 0 : Math.round((stockOuts / items.length) * 1000) / 10
  kpis.push({
    id: 'inv-stockout',
    module: 'inventory',
    label: 'Stock-out Rate',
    value: stockOutRate,
    unit: '%',
    target: 2,
    comparator: 'lte',
    status: statusOf(stockOutRate, 2, 'lte'),
  })

  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel).length
  const lowStockRate = items.length === 0 ? 0 : Math.round((lowStock / items.length) * 1000) / 10
  kpis.push({
    id: 'inv-low-stock',
    module: 'inventory',
    label: 'Low-stock Rate',
    value: lowStockRate,
    unit: '%',
    target: 15,
    comparator: 'lte',
    status: statusOf(lowStockRate, 15, 'lte'),
  })

  // ── Fleet
  const inService = vehicles.filter((v) => v.status === 'active').length
  const operable = vehicles.filter((v) => v.status === 'active' || v.status === 'maintenance').length
  const inServiceRate = operable === 0 ? 100 : Math.round((inService / operable) * 100)
  kpis.push({
    id: 'fleet-availability',
    module: 'fleet',
    label: 'Fleet Availability',
    value: inServiceRate,
    unit: '%',
    target: 90,
    comparator: 'gte',
    status: statusOf(inServiceRate, 90, 'gte'),
  })

  const breakdown = kpis.reduce(
    (acc, k) => ({ ...acc, [k.status]: acc[k.status] + 1 }),
    { pass: 0, warn: 0, fail: 0 },
  )
  const overall = kpis.length === 0 ? 0 : breakdown.pass / kpis.length

  return { kpis, overall, breakdown }
}
