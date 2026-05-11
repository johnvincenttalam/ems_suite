import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { CheckCircle2, ClipboardCheck, ShieldAlert, Wrench } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useWorkOrders } from '@/features/maintenance'
import type {
  InspectionResult,
  WorkOrder,
  WorkOrderStatus,
} from '@/features/maintenance/types'
import { useAssets } from '@/features/assets'
import { useUsers } from '@/features/users'
import { Avatar } from '@/shared/ui/avatar'
import { ExportMenu } from '@/shared/ui/export-menu'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { StatusBadge } from '@/shared/ui/status-badge'
import { cn } from '@/shared/utils/cn'

type ResultFilter = 'all' | 'pass' | 'fail' | 'pending'

const resultFilters: { value: ResultFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
]

const resultStyles: Record<InspectionResult, string> = {
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
}

const resultLabels: Record<InspectionResult, string> = {
  pass: 'Pass',
  fail: 'Fail',
}

export function InspectionsTab() {
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')

  const inspections = useMemo(
    () => workOrders.filter((w) => w.type === 'inspection' && w.status !== 'cancelled'),
    [workOrders],
  )

  const filtered = useMemo(() => {
    return inspections.filter((w) => {
      if (resultFilter === 'all') return true
      if (resultFilter === 'pending') return w.status !== 'completed'
      return w.status === 'completed' && w.inspectionResult === resultFilter
    })
  }, [inspections, resultFilter])

  const stats = useMemo(() => {
    const completed = inspections.filter((w) => w.status === 'completed')
    const pass = completed.filter((w) => w.inspectionResult === 'pass').length
    const fail = completed.filter((w) => w.inspectionResult === 'fail').length
    const pending = inspections.length - completed.length
    return { total: inspections.length, pass, fail, pending }
  }, [inspections])

  const columns = useMemo<ColumnDef<WorkOrder>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Inspection',
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Inspection',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-zinc-900">{row.original.title}</p>
            {row.original.completionNotes && (
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{row.original.completionNotes}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'assetId',
        header: 'Asset',
        cell: ({ getValue }) => {
          const asset = assetMap[getValue() as string]
          return asset ? (
            <div>
              <p className="text-[13px] text-zinc-700">{asset.name}</p>
              <p className="text-[11px] font-mono text-zinc-400">{asset.serialNumber}</p>
            </div>
          ) : (
            <span className="text-zinc-400">{getValue() as string}</span>
          )
        },
      },
      {
        accessorKey: 'assignedTo',
        header: 'Inspector',
        cell: ({ getValue }) => {
          const user = userMap[getValue() as string]
          return user ? (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} size="sm" />
              <span className="text-[13px] text-zinc-700">{user.name}</span>
            </div>
          ) : (
            <span className="text-zinc-400">—</span>
          )
        },
      },
      {
        id: 'result',
        header: 'Result',
        cell: ({ row }) => {
          const wo = row.original
          if (wo.status !== 'completed') return <StatusBadge status={wo.status as WorkOrderStatus} />
          if (!wo.inspectionResult) {
            return <span className="text-[12px] text-zinc-400">—</span>
          }
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md border text-[11.5px] font-medium',
                resultStyles[wo.inspectionResult],
              )}
            >
              {resultLabels[wo.inspectionResult]}
            </span>
          )
        },
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => {
          const wo = row.original
          const date = wo.completedDate ?? wo.scheduledDate
          return (
            <div>
              <p className="text-[13px] text-zinc-700">
                {format(parseISO(date), 'MMM dd, yyyy')}
              </p>
              <p className="text-[11px] text-zinc-400">
                {wo.completedDate ? 'completed' : 'scheduled'}
              </p>
            </div>
          )
        },
      },
    ],
    [assetMap, userMap],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile label="Total" value={stats.total} icon={ClipboardCheck} tone="zinc" />
        <StatTile label="Pending" value={stats.pending} icon={Wrench} tone="amber" />
        <StatTile label="Pass" value={stats.pass} icon={CheckCircle2} tone="emerald" />
        <StatTile label="Fail" value={stats.fail} icon={ShieldAlert} tone="red" />
      </div>

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search inspections...' }}
        filter={<FilterChips options={resultFilters} value={resultFilter} onChange={setResultFilter} />}
      >
        <ExportMenu
          rows={inspections.map((w) => ({
            id: w.id,
            title: w.title,
            asset: assetMap[w.assetId]?.name ?? w.assetId,
            inspector: userMap[w.assignedTo]?.name ?? w.assignedTo,
            status: w.status,
            result: w.inspectionResult ?? '',
            scheduledDate: w.scheduledDate,
            completedDate: w.completedDate ?? '',
            notes: w.completionNotes ?? '',
          })) as unknown as Record<string, unknown>[]}
          baseFilename="inspections"
          sheetName="Inspections"
          pdfTitle="Maintenance Inspections"
          columns={[
            { key: 'id', label: 'Inspection' },
            { key: 'title', label: 'Title' },
            { key: 'asset', label: 'Asset' },
            { key: 'inspector', label: 'Inspector' },
            { key: 'status', label: 'Status' },
            { key: 'result', label: 'Result' },
            { key: 'scheduledDate', label: 'Scheduled' },
            { key: 'completedDate', label: 'Completed' },
            { key: 'notes', label: 'Notes' },
          ]}
        />
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={ClipboardCheck}
        emptyMessage="No inspections match your filters"
      />
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof CheckCircle2
  tone: 'zinc' | 'amber' | 'emerald' | 'red'
}) {
  const toneStyles = {
    zinc: 'bg-zinc-100 text-zinc-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 px-4 py-3 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', toneStyles[tone])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{label}</p>
        <p className="text-lg font-semibold text-zinc-900 tabular-nums leading-none mt-0.5">{value}</p>
      </div>
    </div>
  )
}
