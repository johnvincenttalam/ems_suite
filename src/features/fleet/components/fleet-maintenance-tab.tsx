import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Wrench } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Link, useNavigate } from 'react-router-dom'
import { useVehicles } from '@/features/fleet'
import { useWorkOrders } from '@/features/maintenance'
import { useUsers } from '@/features/users'
import type { WorkOrder, WorkOrderPriority } from '@/features/maintenance/types'
import { Avatar } from '@/shared/ui/avatar'
import { StatusBadge } from '@/shared/ui/status-badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { cn } from '@/shared/utils/cn'

const priorityStyles: Record<WorkOrderPriority, string> = {
  low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

export function FleetMaintenanceTab() {
  const { data: vehicles = [] } = useVehicles()
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: users = [] } = useUsers()
  const navigate = useNavigate()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const vehicleByAssetId = useMemo(() => {
    const map: Record<string, typeof vehicles[number]> = {}
    for (const v of vehicles) if (v.linkedAssetId) map[v.linkedAssetId] = v
    return map
  }, [vehicles])

  const fleetWorkOrders = useMemo(
    () => workOrders.filter((w) => !!vehicleByAssetId[w.assetId]),
    [workOrders, vehicleByAssetId],
  )

  const [search, setSearch] = useState('')

  const columns = useMemo<ColumnDef<WorkOrder>[]>(() => [
    { accessorKey: 'id', header: 'Order', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span> },
    { accessorKey: 'title', header: 'Work', cell: ({ row }) => <span className="font-medium text-zinc-900">{row.original.title}</span> },
    { accessorKey: 'assetId', header: 'Vehicle', cell: ({ getValue }) => {
      const v = vehicleByAssetId[getValue() as string]
      return v ? (
        <div>
          <p className="font-mono text-[12px] text-zinc-700">{v.plateNumber}</p>
          <p className="text-[11px] text-zinc-400">{v.model}</p>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'priority', header: 'Priority', cell: ({ getValue }) => {
      const v = getValue() as WorkOrderPriority
      return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize', priorityStyles[v])}>{v}</span>
    }},
    { accessorKey: 'assignedTo', header: 'Technician', cell: ({ getValue }) => {
      const u = userMap[getValue() as string]
      return u ? (
        <div className="flex items-center gap-2">
          <Avatar name={u.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{u.name}</span>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'scheduledDate', header: 'Scheduled', cell: ({ getValue }) => format(parseISO(getValue() as string), 'MMM dd, yyyy') },
  ], [userMap, vehicleByAssetId])

  const table = useReactTable({
    data: fleetWorkOrders, columns, state: { globalFilter: search }, onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={7} rows={5} />

  if (fleetWorkOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState
          icon={Wrench}
          title="No work orders for the fleet"
          description="Create a work order under Maintenance and link it to a vehicle asset to see it here."
          action={
            <Link to="/module/maintenance" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-fg text-[13px] font-medium hover:bg-accent-hover transition-colors">
              Open Maintenance
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <p className="text-[13px] text-zinc-500 mb-4">
        {fleetWorkOrders.length} work orders linked to fleet vehicles. Manage in the{' '}
        <Link to="/module/maintenance" className="text-zinc-900 font-medium underline-offset-2 hover:underline">
          Maintenance module
        </Link>.
      </p>

      <ListToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Search work orders...' }}
      />

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Wrench}
        emptyMessage="No work orders match your search"
        onRowClick={(wo) => navigate(`/module/maintenance/work-orders?wo=${wo.id}`)}
      />
    </div>
  )
}
