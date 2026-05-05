import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { format, parseISO, startOfMonth, isAfter } from 'date-fns'
import { Users, ShieldCheck, Route as RouteIcon } from 'lucide-react'
import { useUsers } from '@/features/users'
import type { User } from '@/features/users/types'
import { useTrips, useFuelLogs } from '@/features/fleet'
import { Avatar } from '@/shared/ui/avatar'
import { ExportMenu } from '@/shared/ui/export-menu'
import { PageHeader } from '@/shared/ui/page-header'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatCard } from '@/shared/ui/stat-card'
import { formatCompactCurrency } from '@/shared/utils/format'

type UserActivity = User & {
  tripsThisMonth: number
  distanceThisMonth: number
  fuelCostThisMonth: number
}

export function FleetUsersPage() {
  const { data: allUsers = [], isLoading } = useUsers()
  const { data: trips = [] } = useTrips()
  const { data: fuelLogs = [] } = useFuelLogs()
  const [globalFilter, setGlobalFilter] = useState('')

  const fleetUsers = useMemo<UserActivity[]>(() => {
    const monthStart = startOfMonth(new Date())
    return allUsers
      .filter((u) => u.modules.includes('fleet'))
      .map((u) => {
        const userTrips = trips.filter(
          (t) => t.driverId === u.id && isAfter(parseISO(t.startTime), monthStart),
        )
        const distance = userTrips.reduce((s, t) => s + t.distance, 0)
        const fuelCost = fuelLogs
          .filter((f) => f.driverId === u.id && isAfter(parseISO(f.date), monthStart))
          .reduce((s, f) => s + f.totalCost, 0)
        return {
          ...u,
          tripsThisMonth: userTrips.length,
          distanceThisMonth: distance,
          fuelCostThisMonth: fuelCost,
        }
      })
  }, [allUsers, trips, fuelLogs])

  const stats = useMemo(() => {
    const total = fleetUsers.length
    const active = fleetUsers.filter((u) => u.status === 'active').length
    const withTrips = fleetUsers.filter((u) => u.tripsThisMonth > 0).length
    return { total, active, withTrips }
  }, [fleetUsers])

  const columns = useMemo<ColumnDef<UserActivity>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.original.name} size="sm" />
            <div>
              <p className="font-medium text-zinc-900">{row.original.name}</p>
              <p className="text-xs text-zinc-400">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'tripsThisMonth',
        header: 'Trips (MTD)',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return v > 0 ? (
            <span className="tabular-nums text-zinc-700">{v}</span>
          ) : (
            <span className="text-[11px] text-zinc-300">—</span>
          )
        },
      },
      {
        accessorKey: 'distanceThisMonth',
        header: 'Distance (km)',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return v > 0 ? (
            <span className="tabular-nums text-zinc-700">{v.toLocaleString()}</span>
          ) : (
            <span className="text-[11px] text-zinc-300">—</span>
          )
        },
      },
      {
        accessorKey: 'fuelCostThisMonth',
        header: 'Fuel Cost',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return v > 0 ? (
            <span className="tabular-nums text-zinc-700">{formatCompactCurrency(v)}</span>
          ) : (
            <span className="text-[11px] text-zinc-300">—</span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => format(new Date(getValue() as string), 'MMM dd, yyyy'),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: fleetUsers,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading)
    return (
      <div>
        <PageHeader title="Fleet Users" subtitle="Loading..." />
        <TableSkeleton columns={7} rows={6} />
      </div>
    )

  return (
    <div>
      <PageHeader
        title="Fleet Users"
        subtitle={`${fleetUsers.length} user${fleetUsers.length === 1 ? '' : 's'} with fleet access`}
        actions={
          <ExportMenu
            rows={fleetUsers as unknown as Record<string, unknown>[]}
            baseFilename="fleet-users"
            sheetName="Fleet Users"
            pdfTitle="Fleet Users"
            pdfSubtitle={`${fleetUsers.length} user${fleetUsers.length === 1 ? '' : 's'} with fleet access`}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              { key: 'tripsThisMonth', label: 'Trips (MTD)' },
              { key: 'distanceThisMonth', label: 'Distance (km)' },
              { key: 'fuelCostThisMonth', label: 'Fuel Cost' },
              { key: 'status', label: 'Status' },
              { key: 'createdAt', label: 'Created' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          index={0}
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={ShieldCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={1}
        />
        <StatCard
          title="With Trips (MTD)"
          value={stats.withTrips}
          subtitle="Users who drove this month"
          icon={RouteIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          index={2}
        />
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search fleet users..." />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50/50">
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Users} message="No fleet users found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <p className="text-[12px] text-zinc-400 mt-3">
        Module access is managed in the Admin module. Users without Fleet access don't appear here.
      </p>
    </div>
  )
}
