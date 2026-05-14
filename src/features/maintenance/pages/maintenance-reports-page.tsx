import { useMemo } from 'react'
import {
  Wrench,
  Clock,
  CheckCircle2,
  TriangleAlert,
  Users,
  Package,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { differenceInCalendarDays, parseISO, format, subMonths, isAfter, startOfMonth } from 'date-fns'
import { useWorkOrders, workOrderTotalCost } from '@/features/maintenance'
import { formatCurrency } from '@/shared/utils/format'
import { useUsers } from '@/features/users'
import { useAssets } from '@/features/assets'
import { useVehicles } from '@/features/fleet/hooks/use-fleet'
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus, WorkOrderType } from '@/features/maintenance'
import { ExportMenu, StatCard, StatCardSkeleton } from '@/shared/ui/index'
import { PageHeader } from '@/shared/ui/page-header'
import type { ExportColumn } from '@/shared/utils/export-prep'
import { cn } from '@/shared/utils/cn'

interface BreakdownRow {
  key: string
  label: string
  count: number
  percent: number
}

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  pending: 'Pending',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const TYPE_LABEL: Record<WorkOrderType, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  inspection: 'Inspection',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

export function MaintenanceReportsPage() {
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: users = [] } = useUsers()
  const { data: assets = [] } = useAssets()
  const { data: vehicles = [] } = useVehicles()

  const subjectKey = (w: WorkOrder) => w.vehicleId ? `vehicle:${w.vehicleId}` : `asset:${w.assetId ?? 'unknown'}`
  const subjectLabel = (w: WorkOrder) => {
    if (w.vehicleId) {
      const v = vehicles.find((x) => x.id === w.vehicleId)
      return v ? `${v.plateNumber} · ${v.model}` : w.vehicleId
    }
    if (w.assetId) {
      const a = assets.find((x) => x.id === w.assetId)
      return a?.name ?? w.assetId
    }
    return '—'
  }

  const stats = useMemo(() => {
    const today = new Date()
    const total = workOrders.length
    const open = workOrders.filter((w) => w.status === 'pending' || w.status === 'ongoing')
    const completed = workOrders.filter((w) => w.status === 'completed')
    const overdue = open.filter((w) => differenceInCalendarDays(parseISO(w.scheduledDate), today) < 0).length
    const monthStart = startOfMonth(today)
    const totalCost = completed.reduce((s, w) => s + workOrderTotalCost(w), 0)
    const costMTD = completed.reduce((s, w) => {
      if (!w.completedDate || !isAfter(parseISO(w.completedDate), monthStart)) return s
      return s + workOrderTotalCost(w)
    }, 0)
    const costedCount = completed.filter((w) => workOrderTotalCost(w) > 0).length
    const avgCost = costedCount === 0 ? 0 : totalCost / costedCount
    const onTimeCompleted = completed.filter(
      (w) =>
        w.completedDate &&
        differenceInCalendarDays(parseISO(w.completedDate), parseISO(w.scheduledDate)) <= 0,
    ).length
    const pmRate = completed.length === 0 ? 100 : Math.round((onTimeCompleted / completed.length) * 100)
    const mttrSamples = completed.filter((w) => w.completedDate)
    const mttrDays = mttrSamples.length === 0
      ? 0
      : mttrSamples.reduce(
          (s, w) => s + differenceInCalendarDays(parseISO(w.completedDate as string), parseISO(w.createdAt)),
          0,
        ) / mttrSamples.length
    return {
      total,
      completed: completed.length,
      overdue,
      pmRate,
      mttrDays: Math.round(mttrDays * 10) / 10,
      totalCost,
      costMTD,
      avgCost,
    }
  }, [workOrders])

  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const buckets: { month: string; key: string; created: number; completed: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i)
      buckets.push({ month: format(d, 'MMM'), key: format(d, 'yyyy-MM'), created: 0, completed: 0 })
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]))
    for (const w of workOrders) {
      const createdKey = format(parseISO(w.createdAt), 'yyyy-MM')
      const cb = byKey.get(createdKey)
      if (cb) cb.created += 1
      if (w.status === 'completed' && w.completedDate) {
        const completedKey = format(parseISO(w.completedDate), 'yyyy-MM')
        const cb2 = byKey.get(completedKey)
        if (cb2) cb2.completed += 1
      }
    }
    return buckets.map(({ month, created, completed }) => ({ month, created, completed }))
  }, [workOrders])

  const byStatus = useMemo<BreakdownRow[]>(() => {
    const counts = new Map<WorkOrderStatus, number>()
    for (const w of workOrders) counts.set(w.status, (counts.get(w.status) ?? 0) + 1)
    const total = workOrders.length
    return Array.from(counts.entries())
      .map(([k, count]) => ({
        key: k,
        label: STATUS_LABEL[k],
        count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [workOrders])

  const byType = useMemo<BreakdownRow[]>(() => {
    const counts = new Map<WorkOrderType, number>()
    for (const w of workOrders) counts.set(w.type, (counts.get(w.type) ?? 0) + 1)
    const total = workOrders.length
    const order: WorkOrderType[] = ['preventive', 'corrective', 'inspection']
    return order
      .map((k) => {
        const count = counts.get(k) ?? 0
        return {
          key: k,
          label: TYPE_LABEL[k],
          count,
          percent: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      })
      .filter((r) => r.count > 0)
  }, [workOrders])

  const byPriority = useMemo<BreakdownRow[]>(() => {
    const counts = new Map<WorkOrderPriority, number>()
    for (const w of workOrders) counts.set(w.priority, (counts.get(w.priority) ?? 0) + 1)
    const total = workOrders.length
    const order: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']
    return order
      .map((k) => {
        const count = counts.get(k) ?? 0
        return {
          key: k,
          label: PRIORITY_LABEL[k],
          count,
          percent: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      })
      .filter((r) => r.count > 0)
  }, [workOrders])

  const byTechnician = useMemo<BreakdownRow[]>(() => {
    const counts = new Map<string, { open: number; completed: number }>()
    for (const w of workOrders) {
      const cur = counts.get(w.assignedTo) ?? { open: 0, completed: 0 }
      if (w.status === 'completed') cur.completed += 1
      else cur.open += 1
      counts.set(w.assignedTo, cur)
    }
    return Array.from(counts.entries())
      .map(([id, { open, completed }]) => ({
        key: id,
        label: users.find((u) => u.id === id)?.name ?? id,
        count: open + completed,
        percent: open === 0 && completed === 0 ? 0 : Math.round((completed / (open + completed)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [workOrders, users])

  const byAsset = useMemo(() => {
    const counts = new Map<string, { count: number; label: string }>()
    for (const w of workOrders) {
      const k = subjectKey(w)
      const existing = counts.get(k) ?? { count: 0, label: subjectLabel(w) }
      counts.set(k, { count: existing.count + 1, label: existing.label })
    }
    return Array.from(counts.entries())
      .map(([key, { count, label }]) => ({ key, label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders, assets, vehicles])

  const costByType = useMemo(() => {
    const sums = new Map<WorkOrderType, number>()
    for (const w of workOrders) {
      if (w.status !== 'completed') continue
      const cost = workOrderTotalCost(w)
      if (cost === 0) continue
      sums.set(w.type, (sums.get(w.type) ?? 0) + cost)
    }
    const order: WorkOrderType[] = ['preventive', 'corrective', 'inspection']
    return order
      .map((k) => ({ key: k, label: TYPE_LABEL[k], cost: sums.get(k) ?? 0 }))
      .filter((r) => r.cost > 0)
  }, [workOrders])

  const costByAsset = useMemo(() => {
    const sums = new Map<string, { cost: number; label: string }>()
    for (const w of workOrders) {
      if (w.status !== 'completed') continue
      const cost = workOrderTotalCost(w)
      if (cost === 0) continue
      const k = subjectKey(w)
      const existing = sums.get(k) ?? { cost: 0, label: subjectLabel(w) }
      sums.set(k, { cost: existing.cost + cost, label: existing.label })
    }
    return Array.from(sums.entries())
      .map(([key, { cost, label }]) => ({ key, label, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders, assets, vehicles])

  const overdueList = useMemo(() => {
    const today = new Date()
    return workOrders
      .filter((w) => (w.status === 'pending' || w.status === 'ongoing') && isAfter(today, parseISO(w.scheduledDate)))
      .map((w) => ({
        ...w,
        daysOverdue: differenceInCalendarDays(today, parseISO(w.scheduledDate)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 6)
  }, [workOrders])

  const exportRows = useMemo(
    () =>
      workOrders.map((w: WorkOrder) => ({
        id: w.id,
        title: w.title,
        asset: subjectLabel(w),
        type: TYPE_LABEL[w.type],
        priority: PRIORITY_LABEL[w.priority],
        technician: users.find((u) => u.id === w.assignedTo)?.name ?? w.assignedTo,
        status: STATUS_LABEL[w.status],
        scheduledDate: w.scheduledDate,
        completedDate: w.completedDate ?? '',
        cycleDays:
          w.completedDate
            ? differenceInCalendarDays(parseISO(w.completedDate), parseISO(w.createdAt))
            : '',
        laborHours: w.laborHours ?? '',
        laborCost: w.laborCost ?? '',
        partsCount: (w.partsUsed ?? []).length,
        totalCost: w.status === 'completed' ? workOrderTotalCost(w) : '',
      })),
    [workOrders, assets, users],
  )

  const exportColumns: ExportColumn[] = [
    { key: 'id', label: 'Order' },
    { key: 'title', label: 'Title' },
    { key: 'asset', label: 'Asset' },
    { key: 'type', label: 'Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'technician', label: 'Technician' },
    { key: 'status', label: 'Status' },
    { key: 'scheduledDate', label: 'Scheduled' },
    { key: 'completedDate', label: 'Completed' },
    { key: 'cycleDays', label: 'Cycle (days)' },
    { key: 'laborHours', label: 'Labor Hours' },
    { key: 'laborCost', label: 'Labor Cost' },
    { key: 'partsCount', label: '# Parts' },
    { key: 'totalCost', label: 'Total Cost' },
  ]

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="PM compliance, MTTR, cost, and per-technician load" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="PM compliance, MTTR, cost, and per-technician load"
        actions={
          <ExportMenu
            rows={exportRows}
            baseFilename="maintenance-report"
            sheetName="Work Orders"
            pdfTitle="Maintenance Report"
            pdfSubtitle={`${exportRows.length} work order${exportRows.length === 1 ? '' : 's'}`}
            columns={exportColumns}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Work Orders" value={stats.total} icon={Wrench} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={0} />
        <StatCard title="PM On-time Rate" value={`${stats.pmRate}%`} subtitle={`${stats.completed} completed`} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={1} />
        <StatCard title="MTTR" value={stats.mttrDays > 0 ? `${stats.mttrDays} d` : '—'} subtitle="Mean time to resolution" icon={Clock} iconBg="bg-blue-50" iconColor="text-blue-600" index={2} />
        <StatCard title="Total Cost" value={formatCurrency(stats.totalCost)} subtitle="All completed WOs" icon={DollarSign} iconBg="bg-violet-50" iconColor="text-violet-600" index={3} />
        <StatCard title="Cost (MTD)" value={formatCurrency(stats.costMTD)} subtitle="Labor + parts" icon={DollarSign} iconBg="bg-violet-50" iconColor="text-violet-600" index={4} />
        <StatCard title="Avg Cost / WO" value={formatCurrency(stats.avgCost)} subtitle="With costed WOs" icon={DollarSign} iconBg="bg-violet-50" iconColor="text-violet-600" index={5} />
        <StatCard title="Overdue" value={stats.overdue} icon={TriangleAlert} iconBg="bg-red-50" iconColor="text-red-600" index={6} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={7} />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Created vs. Completed</h3>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Last 6 months</span>
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="created" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Created" />
              <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TechnicianCard rows={byTechnician} />
        <BreakdownCard title="By Type" rows={byType} icon={Wrench} barColor="bg-violet-500" />
        <CostByCard title="Cost by Type" rows={costByType} icon={DollarSign} barColor="bg-violet-500" />
        <CostByCard title="Cost by Asset" rows={costByAsset} icon={DollarSign} barColor="bg-blue-500" />
        <BreakdownCard title="By Priority" rows={byPriority} icon={TriangleAlert} barColor="bg-amber-500" />
        <BreakdownCard title="By Status" rows={byStatus} icon={CheckCircle2} barColor="bg-emerald-500" />
        <TopAssetsCard rows={byAsset} />
        <OverdueCard rows={overdueList} users={users} assets={assets} vehicles={vehicles} />
      </div>
    </div>
  )
}

function TechnicianCard({
  rows,
}: {
  rows: { key: string; label: string; count: number; percent: number }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">By Technician</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">% completed</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No assignments yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-700 truncate flex-1 mr-3">{r.label}</span>
                <span className="text-zinc-400 tabular-nums flex-shrink-0">
                  {r.count} <span className="text-zinc-300">·</span> {r.percent}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full rounded-full transition-all bg-violet-500" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
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
  icon: typeof Users
  barColor: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
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
                  {r.count} <span className="text-zinc-300">·</span> {r.percent}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TopAssetsCard({ rows }: { rows: { key: string; label: string; count: number }[] }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">Top Assets by WO Count</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No work orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between py-1.5 border-b border-zinc-100/60 last:border-0">
              <p className="text-[13px] text-zinc-700 truncate flex-1 mr-3">{r.label}</p>
              <span className="text-[12px] text-zinc-700 tabular-nums whitespace-nowrap">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CostByCard({
  title,
  rows,
  icon: Icon,
  barColor,
}: {
  title: string
  rows: { key: string; label: string; cost: number }[]
  icon: typeof Users
  barColor: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.cost))
  const total = rows.reduce((s, r) => s + r.cost, 0)
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
          {formatCurrency(total)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No cost data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-700 truncate flex-1 mr-3">{r.label}</span>
                <span className="text-zinc-700 tabular-nums flex-shrink-0">{formatCurrency(r.cost)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${(r.cost / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OverdueCard({
  rows,
  users,
  assets,
  vehicles,
}: {
  rows: (WorkOrder & { daysOverdue: number })[]
  users: { id: string; name: string }[]
  assets: { id: string; name: string }[]
  vehicles: { id: string; plateNumber: string; model: string }[]
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">Most Overdue</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">Nothing overdue — all open work orders on schedule.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((w) => {
            const tech = users.find((u) => u.id === w.assignedTo)
            const label = w.vehicleId
              ? (() => {
                  const v = vehicles.find((x) => x.id === w.vehicleId)
                  return v ? `${v.plateNumber} · ${v.model}` : w.vehicleId
                })()
              : (w.assetId ? (assets.find((a) => a.id === w.assetId)?.name ?? w.assetId) : '—')
            return (
              <li key={w.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100/60 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{w.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {label}
                    {tech && <> · {tech.name}</>}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-medium tabular-nums whitespace-nowrap">
                  {w.daysOverdue}d
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
