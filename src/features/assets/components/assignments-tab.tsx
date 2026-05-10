import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { ClipboardList, Undo2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAssetAssignments, useAssets } from '@/features/assets'
import { useUsers } from '@/features/users'
import type { AssetAssignment } from '@/features/assets/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Avatar } from '@/shared/ui/avatar'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'

type AssignmentFilter = 'all' | 'active' | 'returned'

const filterOptions: { value: AssignmentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'returned', label: 'Returned' },
]

export function AssignmentsTab() {
  const { data: assignments = [], isLoading } = useAssetAssignments()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssignmentFilter>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return assignments
    if (statusFilter === 'active') return assignments.filter((a) => !a.returnedDate)
    return assignments.filter((a) => !!a.returnedDate)
  }, [assignments, statusFilter])

  const columns = useMemo<ColumnDef<AssetAssignment>[]>(() => [
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-500">{format(new Date(getValue() as string), 'MMM dd, yyyy')}</span>
    )},
    { accessorKey: 'assetId', header: 'Asset', cell: ({ getValue }) => {
      const asset = assetMap[getValue() as string]
      return asset ? (
        <div>
          <p className="text-[13px] font-medium text-zinc-900">{asset.name}</p>
          <p className="text-[11px] font-mono text-zinc-400">{asset.serialNumber}</p>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'assignedTo', header: 'Assignee', cell: ({ getValue }) => {
      const user = userMap[getValue() as string]
      return user ? (
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{user.name}</span>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'returnedDate', header: 'Returned', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (v) return <span className="text-zinc-500">{format(new Date(v), 'MMM dd, yyyy')}</span>
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">Active</span>
    }},
    { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => <span className="text-zinc-600">{(getValue() as string) ?? '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => {
      if (row.original.returnedDate) return null
      return (
        <button
          onClick={() => toast.success(`Returned ${assetMap[row.original.assetId]?.name ?? 'asset'}`)}
          title="Mark returned"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Return
        </button>
      )
    }},
  ], [assetMap, userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search assignments...' }}
        filter={<FilterChips options={filterOptions} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={assignments as unknown as Record<string, unknown>[]}
          baseFilename="asset-assignments"
          sheetName="Assignments"
          pdfTitle="Asset Assignments"
          columns={[
            { key: 'assignedDate', label: 'Assigned' },
            { key: 'assetId', label: 'Asset' },
            { key: 'assignedTo', label: 'Assigned To' },
            { key: 'returnedDate', label: 'Returned' },
            { key: 'notes', label: 'Notes' },
          ]}
        />
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={ClipboardList}
        emptyMessage="No assignments to show"
      />
    </div>
  )
}
