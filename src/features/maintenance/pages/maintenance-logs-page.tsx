import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { Activity } from 'lucide-react'
import { format } from 'date-fns'
import { useAuditLog } from '@/features/audit-log'
import type { AuditAction, AuditEntry } from '@/features/audit-log/types'
import { Avatar } from '@/shared/ui/avatar'
import { ExportMenu } from '@/shared/ui/export-menu'
import { PageHeader } from '@/shared/ui/page-header'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { cn } from '@/shared/utils/cn'

const actionStyles: Record<AuditAction, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border-blue-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  approve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reject: 'bg-red-50 text-red-700 border-red-200',
  login: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  logout: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const actionFilters: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
]

export function MaintenanceLogsPage() {
  const { data: allEntries = [], isLoading } = useAuditLog()
  const [globalFilter, setGlobalFilter] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')

  const maintEntries = useMemo(
    () => allEntries.filter((e) => e.module === 'Maintenance'),
    [allEntries],
  )

  const filtered = useMemo(
    () => actionFilter === 'all' ? maintEntries : maintEntries.filter((e) => e.action === actionFilter),
    [maintEntries, actionFilter],
  )

  const columns = useMemo<ColumnDef<AuditEntry>[]>(() => [
    { accessorKey: 'timestamp', header: 'Time', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">{format(new Date(getValue() as string), 'MMM dd, HH:mm:ss')}</span>
    )},
    { accessorKey: 'userName', header: 'User', cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.original.userName} size="sm" />
        <div>
          <p className="text-[13px] font-medium text-zinc-900">{row.original.userName}</p>
          <p className="text-[11px] font-mono text-zinc-400">{row.original.userId}</p>
        </div>
      </div>
    )},
    { accessorKey: 'action', header: 'Action', cell: ({ getValue }) => {
      const v = getValue() as AuditAction
      return (
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium uppercase tracking-wide',
          actionStyles[v],
        )}>
          {v}
        </span>
      )
    }},
    { accessorKey: 'detail', header: 'Detail', cell: ({ getValue }) => <span className="text-zinc-600">{getValue() as string}</span> },
  ], [])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  if (isLoading) return (
    <div>
      <PageHeader title="System Logs" subtitle="Loading..." />
      <TableSkeleton columns={4} rows={8} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="System Logs"
        subtitle={`${maintEntries.length} maintenance event${maintEntries.length === 1 ? '' : 's'} recorded`}
      />

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search by user or detail...' }}
        filter={<FilterChips options={actionFilters} value={actionFilter} onChange={(v) => setActionFilter(v as AuditAction | 'all')} />}
      >
        <ExportMenu
          rows={maintEntries as unknown as Record<string, unknown>[]}
          baseFilename="maintenance-logs"
          sheetName="Maintenance Logs"
          pdfTitle="Maintenance System Logs"
          pdfSubtitle={`${maintEntries.length} event${maintEntries.length === 1 ? '' : 's'} recorded`}
          columns={[
            { key: 'timestamp', label: 'Timestamp' },
            { key: 'userName', label: 'User' },
            { key: 'action', label: 'Action' },
            { key: 'detail', label: 'Detail' },
          ]}
        />
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Activity}
        emptyMessage="No events match your filters"
      />
    </div>
  )
}
