import { useMemo } from 'react'
import {
  CheckCircle2,
  Clock,
  ShoppingCart,
  ThumbsDown,
  TriangleAlert,
  TrendingUp,
  Building2,
} from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useRequests } from '@/features/procurement'
import { useDepartments } from '@/features/departments'
import { useSuppliers } from '@/features/suppliers'
import {
  PRIORITY_LABEL,
  type RequestPriority,
  type RequestStatus,
  type RequestWithItems,
} from '@/features/procurement/types'
import { ExportMenu, StatCard, StatCardSkeleton } from '@/shared/ui/index'
import type { ExportColumn } from '@/shared/utils/export-prep'
import { formatCompactCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

interface BreakdownRow {
  key: string
  label: string
  count: number
  amount: number
  percent: number
}

function buildBreakdown<K extends string>(
  requests: RequestWithItems[],
  pick: (r: RequestWithItems) => K | undefined,
  labelMap: Record<K, string>,
): BreakdownRow[] {
  const counts = new Map<K, { count: number; amount: number }>()
  let total = 0
  for (const r of requests) {
    const k = pick(r)
    if (!k) continue
    const current = counts.get(k) ?? { count: 0, amount: 0 }
    counts.set(k, { count: current.count + 1, amount: current.amount + r.totalAmount })
    total += 1
  }
  return Array.from(counts.entries())
    .map(([k, { count, amount }]) => ({
      key: k,
      label: labelMap[k],
      count,
      amount,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function ReportsTab() {
  const { data: requests = [], isLoading } = useRequests()
  const { data: departments = [] } = useDepartments()
  const { data: suppliers = [] } = useSuppliers()

  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => r.status === 'pending')
    const approved = requests.filter((r) => r.status === 'approved')
    const rejected = requests.filter((r) => r.status === 'rejected')
    const approvedSpend = approved.reduce((s, r) => s + r.totalAmount, 0)
    const pendingValue = pending.reduce((s, r) => s + r.totalAmount, 0)
    const today = new Date()
    const overdue = pending.filter((r) => {
      if (!r.neededBy) return false
      return differenceInCalendarDays(parseISO(r.neededBy), today) < 0
    }).length
    const urgent = pending.filter((r) => r.priority === 'urgent').length
    return { total, pending: pending.length, approved: approved.length, rejected: rejected.length, approvedSpend, pendingValue, overdue, urgent }
  }, [requests])

  const byStatus = useMemo(
    () => buildBreakdown<RequestStatus>(requests, (r) => r.status, STATUS_LABEL),
    [requests],
  )

  const byPriority = useMemo(
    () => buildBreakdown<RequestPriority>(requests, (r) => r.priority, PRIORITY_LABEL),
    [requests],
  )

  const byDepartment = useMemo(() => {
    const labelMap = Object.fromEntries(departments.map((d) => [d.id, d.name])) as Record<string, string>
    return buildBreakdown(requests, (r) => r.departmentId, labelMap)
  }, [requests, departments])

  const bySupplier = useMemo(() => {
    const labelMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name])) as Record<string, string>
    return buildBreakdown(
      requests.filter((r) => !!r.supplierId),
      (r) => r.supplierId,
      labelMap,
    )
  }, [requests, suppliers])

  const exportRows = useMemo(
    () =>
      requests.map((r) => ({
        id: r.id,
        requesterId: r.requesterId,
        departmentId: departments.find((d) => d.id === r.departmentId)?.name ?? '',
        supplierId: suppliers.find((s) => s.id === r.supplierId)?.name ?? '',
        priority: r.priority ? PRIORITY_LABEL[r.priority] : '',
        totalAmount: r.totalAmount,
        status: r.status,
        chain: r.approvers ? `${r.currentApproverIndex ?? 0}/${r.approvers.length}` : '',
        createdAt: r.createdAt,
        approvedAt: r.approvedAt ?? '',
        rejectedReason: r.rejectedReason ?? '',
      })),
    [requests, departments, suppliers],
  )

  const exportColumns: ExportColumn[] = [
    { key: 'id', label: 'Request' },
    { key: 'requesterId', label: 'Requester' },
    { key: 'departmentId', label: 'Department' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'priority', label: 'Priority' },
    { key: 'totalAmount', label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: 'chain', label: 'Approval' },
    { key: 'createdAt', label: 'Created' },
    { key: 'approvedAt', label: 'Approved' },
    { key: 'rejectedReason', label: 'Rejection Reason' },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <ExportMenu
          rows={exportRows}
          baseFilename="procurement-reports"
          sheetName="Requests"
          pdfTitle="Procurement Report"
          pdfSubtitle={`${exportRows.length} request${exportRows.length === 1 ? '' : 's'} · all statuses`}
          columns={exportColumns}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats.total} icon={ShoppingCart} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={0} />
        <StatCard title="Pending" value={stats.pending} subtitle={formatCompactCurrency(stats.pendingValue) + ' value'} icon={Clock} iconBg="bg-blue-50" iconColor="text-blue-600" index={1} />
        <StatCard title="Approved Spend" value={formatCompactCurrency(stats.approvedSpend)} subtitle={`${stats.approved} request${stats.approved === 1 ? '' : 's'}`} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={2} />
        <StatCard title="Rejected" value={stats.rejected} icon={ThumbsDown} iconBg="bg-red-50" iconColor="text-red-600" index={3} />
        <StatCard title="Overdue" value={stats.overdue} subtitle="Pending past needed-by" icon={TriangleAlert} iconBg="bg-amber-50" iconColor="text-amber-600" index={4} />
        <StatCard title="Urgent Pending" value={stats.urgent} icon={TrendingUp} iconBg="bg-red-50" iconColor="text-red-600" index={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard title="By Department" rows={byDepartment} icon={Building2} barColor="bg-violet-500" />
        <BreakdownCard title="By Supplier" rows={bySupplier} icon={ShoppingCart} barColor="bg-blue-500" />
        <BreakdownCard title="By Priority" rows={byPriority} icon={TrendingUp} barColor="bg-amber-500" />
        <BreakdownCard title="By Status" rows={byStatus} icon={CheckCircle2} barColor="bg-emerald-500" />
      </div>
    </div>
  )
}

function BreakdownCard({
  title,
  rows,
  icon: Icon,
  barColor,
}: {
  title: string
  rows: BreakdownRow[]
  icon: typeof Building2
  barColor: string
}) {
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount))
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
          {rows.reduce((s, r) => s + r.count, 0)} total
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-700 truncate flex-1 mr-3">{r.label}</span>
                <span className="text-zinc-400 tabular-nums flex-shrink-0">
                  {r.count} <span className="text-zinc-300">·</span> {formatCompactCurrency(r.amount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${(r.amount / maxAmount) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
