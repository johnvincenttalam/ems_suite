import { useMemo } from 'react'
import {
  Package,
  Wrench,
  UserCheck,
  Trash2,
  Tag,
  CheckCircle2,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useAssets, useAssetAssignments } from '@/features/assets'
import { useCategories } from '@/features/categories'
import { useWarehouses } from '@/features/warehouses'
import { useUsers } from '@/features/users'
import type { Asset, AssetStatus } from '@/features/assets'
import { ExportMenu, StatCard, StatCardSkeleton } from '@/shared/ui/index'
import { PageHeader } from '@/shared/ui/page-header'
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
  assets: Asset[],
  pick: (a: Asset) => K | undefined,
  labelMap: Record<string, string>,
): BreakdownRow[] {
  const counts = new Map<K, { count: number; amount: number }>()
  let total = 0
  for (const a of assets) {
    const k = pick(a)
    if (!k) continue
    const current = counts.get(k) ?? { count: 0, amount: 0 }
    counts.set(k, { count: current.count + 1, amount: current.amount + (a.purchaseCost ?? 0) })
    total += 1
  }
  return Array.from(counts.entries())
    .map(([k, { count, amount }]) => ({
      key: k,
      label: labelMap[k] ?? k,
      count,
      amount,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
}

const STATUS_LABEL: Record<AssetStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  disposed: 'Disposed',
}

const ASSIGNMENT_OVERDUE_DAYS = 30

export function AssetsReportsPage() {
  const { data: assets = [], isLoading } = useAssets()
  const { data: assignments = [] } = useAssetAssignments()
  const { data: categories = [] } = useCategories()
  const { data: warehouses = [] } = useWarehouses()
  const { data: users = [] } = useUsers()

  const stats = useMemo(() => {
    const total = assets.length
    const active = assets.filter((a) => a.status === 'active').length
    const inMaintenance = assets.filter((a) => a.status === 'maintenance').length
    const disposed = assets.filter((a) => a.status === 'disposed').length
    const activeValue = assets.filter((a) => a.status !== 'disposed').reduce((s, a) => s + (a.purchaseCost ?? 0), 0)
    const disposedValue = assets.filter((a) => a.status === 'disposed').reduce((s, a) => s + (a.purchaseCost ?? 0), 0)
    const openAssignments = assignments.filter((a) => !a.returnedDate).length
    const today = new Date()
    const longCheckouts = assignments.filter(
      (a) => !a.returnedDate && differenceInCalendarDays(today, parseISO(a.assignedDate)) >= ASSIGNMENT_OVERDUE_DAYS,
    ).length
    const utilizationRate = total === 0 ? 0 : Math.round((openAssignments / total) * 100)
    return { total, active, inMaintenance, disposed, activeValue, disposedValue, openAssignments, longCheckouts, utilizationRate }
  }, [assets, assignments])

  const byCategory = useMemo(() => {
    const labelMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
    return buildBreakdown(assets, (a) => a.categoryId, labelMap)
  }, [assets, categories])

  const byLocation = useMemo(() => {
    const labelMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]))
    return buildBreakdown(assets, (a) => a.locationId, labelMap)
  }, [assets, warehouses])

  const byStatus = useMemo(() => {
    return buildBreakdown<AssetStatus>(assets, (a) => a.status, STATUS_LABEL as Record<string, string>)
  }, [assets])

  const byCustodian = useMemo(() => {
    const open = assignments.filter((a) => !a.returnedDate)
    const counts = new Map<string, number>()
    for (const a of open) counts.set(a.assignedTo, (counts.get(a.assignedTo) ?? 0) + 1)
    const total = open.length
    return Array.from(counts.entries())
      .map(([id, count]) => ({
        key: id,
        label: users.find((u) => u.id === id)?.name ?? id,
        count,
        amount: count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [assignments, users])

  const exportRows = useMemo(
    () =>
      assets.map((a) => ({
        id: a.id,
        serial: a.serialNumber,
        name: a.name,
        category: categories.find((c) => c.id === a.categoryId)?.name ?? '',
        location: warehouses.find((w) => w.id === a.locationId)?.name ?? '',
        status: STATUS_LABEL[a.status],
        assignedTo: a.assignedTo ? users.find((u) => u.id === a.assignedTo)?.name ?? a.assignedTo : '',
        purchaseDate: a.purchaseDate,
        purchaseCost: a.purchaseCost ?? '',
      })),
    [assets, categories, warehouses, users],
  )

  const exportColumns: ExportColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'serial', label: 'Serial' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'purchaseDate', label: 'Purchased' },
    { key: 'purchaseCost', label: 'Cost' },
  ]

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Asset utilization, lifecycle, and value analysis" />
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
        subtitle="Asset utilization, lifecycle, and value analysis"
        actions={
          <ExportMenu
            rows={exportRows}
            baseFilename="assets-report"
            sheetName="Assets"
            pdfTitle="Asset Registry Report"
            pdfSubtitle={`${exportRows.length} asset${exportRows.length === 1 ? '' : 's'}`}
            columns={exportColumns}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Assets" value={stats.total} icon={Package} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={0} />
        <StatCard title="Active Value" value={formatCompactCurrency(stats.activeValue)} subtitle={`${stats.active} active`} icon={Tag} iconBg="bg-violet-50" iconColor="text-violet-600" index={1} />
        <StatCard title="In Maintenance" value={stats.inMaintenance} icon={Wrench} iconBg="bg-orange-50" iconColor="text-orange-600" index={2} />
        <StatCard title="Disposed" value={stats.disposed} subtitle={formatCompactCurrency(stats.disposedValue) + ' written off'} icon={Trash2} iconBg="bg-zinc-100" iconColor="text-zinc-500" index={3} />
        <StatCard title="Utilization Rate" value={`${stats.utilizationRate}%`} subtitle="Currently checked out" icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={4} />
        <StatCard title="Open Assignments" value={stats.openAssignments} icon={UserCheck} iconBg="bg-blue-50" iconColor="text-blue-600" index={5} />
        <StatCard title="Long Checkouts" value={stats.longCheckouts} subtitle={`${ASSIGNMENT_OVERDUE_DAYS}+ days held`} icon={Calendar} iconBg="bg-amber-50" iconColor="text-amber-600" index={6} />
        <StatCard title="Categories" value={byCategory.length} icon={Tag} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={7} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard title="By Category" rows={byCategory} icon={Tag} barColor="bg-violet-500" valueAsCurrency />
        <BreakdownCard title="By Location" rows={byLocation} icon={Package} barColor="bg-emerald-500" valueAsCurrency />
        <BreakdownCard title="By Status" rows={byStatus} icon={CheckCircle2} barColor="bg-amber-500" valueAsCurrency />
        <BreakdownCard title="Top Custodians (Open)" rows={byCustodian} icon={UserCheck} barColor="bg-blue-500" />
      </div>
    </div>
  )
}

function BreakdownCard({
  title,
  rows,
  icon: Icon,
  barColor,
  valueAsCurrency = false,
}: {
  title: string
  rows: BreakdownRow[]
  icon: typeof Package
  barColor: string
  valueAsCurrency?: boolean
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
                  {r.count}
                  {valueAsCurrency && (
                    <>
                      {' '}
                      <span className="text-zinc-300">·</span> {formatCompactCurrency(r.amount)}
                    </>
                  )}
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
