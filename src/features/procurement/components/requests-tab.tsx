import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useRequests } from '@/features/procurement'
import { useDepartments } from '@/features/departments'
import { useSuppliers } from '@/features/suppliers'
import { useUsers } from '@/features/users'
import {
  PRIORITY_LABEL,
  type RequestPriority,
  type RequestStatus,
  type RequestWithItems,
} from '@/features/procurement/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'
import { NewRequestModal } from './new-request-modal'
import { RequestDetailDrawer } from './request-detail-drawer'

const statusFilters: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const priorityChip: Record<RequestPriority, string> = {
  low: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
}

export function RequestsTab() {
  const { data: requests = [], isLoading } = useRequests()
  const { data: departments = [] } = useDepartments()
  const { data: suppliers = [] } = useSuppliers()
  const { data: users = [] } = useUsers()
  const [searchParams, setSearchParams] = useSearchParams()

  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments])
  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [drawerReq, setDrawerReq] = useState<RequestWithItems | null>(null)

  const deepLinkId = searchParams.get('req')
  useEffect(() => {
    if (!deepLinkId || requests.length === 0) return
    const target = requests.find((r) => r.id === deepLinkId)
    if (target) setDrawerReq(target)
  }, [deepLinkId, requests])

  const closeDrawer = () => {
    setDrawerReq(null)
    if (searchParams.has('req')) {
      const next = new URLSearchParams(searchParams)
      next.delete('req')
      setSearchParams(next, { replace: true })
    }
  }

  const filtered = useMemo(
    () => statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter],
  )

  const columns = useMemo<ColumnDef<RequestWithItems>[]>(() => [
    { accessorKey: 'id', header: 'Request', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span> },
    { accessorKey: 'requesterId', header: 'Requester', cell: ({ getValue }) => userMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'departmentId', header: 'Department', cell: ({ getValue }) => deptMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'supplierId', header: 'Supplier', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? (supplierMap[v]?.name ?? '—') : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'priority', header: 'Priority', cell: ({ getValue }) => {
      const v = getValue() as RequestPriority | undefined
      if (!v) return <span className="text-zinc-300">—</span>
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium', priorityChip[v])}>
          {PRIORITY_LABEL[v]}
        </span>
      )
    }},
    { id: 'lines', header: 'Lines', cell: ({ row }) => <span className="tabular-nums text-zinc-500">{row.original.items.length}</span> },
    { accessorKey: 'totalAmount', header: 'Total', cell: ({ getValue }) => <span className="tabular-nums font-medium text-zinc-900">{formatCurrency(getValue() as number)}</span> },
    { id: 'chain', header: 'Approval', cell: ({ row }) => {
      const r = row.original
      if (!r.approvers || r.approvers.length === 0) return <span className="text-zinc-400">—</span>
      const idx = r.currentApproverIndex ?? 0
      return <span className="font-mono text-[11px] text-zinc-500">{Math.min(idx, r.approvers.length)}/{r.approvers.length}</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} size="sm" /> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => <span className="whitespace-nowrap">{format(new Date(getValue() as string), 'MMM dd, yyyy')}</span> },
    { id: 'chev', header: '', cell: () => <ChevronRight className="w-4 h-4 text-zinc-300" /> },
  ], [userMap, deptMap, supplierMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={11} rows={6} />

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search requests..." />
          </div>
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="flex gap-2">
          <ExportMenu
            rows={requests as unknown as Record<string, unknown>[]}
            baseFilename="procurement-requests"
            sheetName="Requests"
            pdfTitle="Procurement Requests"
            pdfSubtitle={`${requests.length} request${requests.length === 1 ? '' : 's'}`}
            columns={[
              { key: 'id', label: 'Request' },
              { key: 'requesterId', label: 'Requester' },
              { key: 'departmentId', label: 'Department' },
              { key: 'supplierId', label: 'Supplier' },
              { key: 'priority', label: 'Priority' },
              { key: 'totalAmount', label: 'Total' },
              { key: 'status', label: 'Status' },
              { key: 'createdAt', label: 'Created' },
            ]}
          />
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>New Request</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setDrawerReq(row.original)}
                  className="border-b border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
                >
                  {row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={ClipboardList} message="No requests match your filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <NewRequestModal open={showNew} onClose={() => setShowNew(false)} />
      <RequestDetailDrawer request={drawerReq} onClose={closeDrawer} />
    </div>
  )
}
