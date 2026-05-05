import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { Users, ShieldCheck, UserCheck } from 'lucide-react'
import { useUsers } from '@/features/users'
import type { User } from '@/features/users/types'
import { useAssetAssignments } from '@/features/assets'
import { Avatar } from '@/shared/ui/avatar'
import { ExportMenu } from '@/shared/ui/export-menu'
import { PageHeader } from '@/shared/ui/page-header'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatCard } from '@/shared/ui/stat-card'

type UserActivity = User & {
  openAssignments: number
  totalAssignments: number
}

export function AssetsUsersPage() {
  const { data: allUsers = [], isLoading } = useUsers()
  const { data: assignments = [] } = useAssetAssignments()
  const [globalFilter, setGlobalFilter] = useState('')

  const assetUsers = useMemo<UserActivity[]>(() => {
    return allUsers
      .filter((u) => u.modules.includes('assets'))
      .map((u) => {
        const userAssignments = assignments.filter((a) => a.assignedTo === u.id)
        const open = userAssignments.filter((a) => !a.returnedDate)
        return {
          ...u,
          openAssignments: open.length,
          totalAssignments: userAssignments.length,
        }
      })
  }, [allUsers, assignments])

  const stats = useMemo(() => {
    const total = assetUsers.length
    const active = assetUsers.filter((u) => u.status === 'active').length
    const withOpen = assetUsers.filter((u) => u.openAssignments > 0).length
    return { total, active, withOpen }
  }, [assetUsers])

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
        accessorKey: 'openAssignments',
        header: 'Open',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return v > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
              {v} held
            </span>
          ) : (
            <span className="text-[11px] text-zinc-300">—</span>
          )
        },
      },
      {
        accessorKey: 'totalAssignments',
        header: 'Total Assignments',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-zinc-700">{getValue() as number}</span>
        ),
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
    data: assetUsers,
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
        <PageHeader title="Assets Users" subtitle="Loading..." />
        <TableSkeleton columns={6} rows={6} />
      </div>
    )

  return (
    <div>
      <PageHeader
        title="Assets Users"
        subtitle={`${assetUsers.length} user${assetUsers.length === 1 ? '' : 's'} with asset access`}
        actions={
          <ExportMenu
            rows={assetUsers as unknown as Record<string, unknown>[]}
            baseFilename="assets-users"
            sheetName="Assets Users"
            pdfTitle="Assets Users"
            pdfSubtitle={`${assetUsers.length} user${assetUsers.length === 1 ? '' : 's'} with asset access`}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              { key: 'openAssignments', label: 'Open Assignments' },
              { key: 'totalAssignments', label: 'Total Assignments' },
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
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
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
          title="With Open Checkouts"
          value={stats.withOpen}
          subtitle="Users currently holding assets"
          icon={UserCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          index={2}
        />
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search asset users..." />
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
                <DataTableEmpty colSpan={columns.length} icon={Users} message="No asset users found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <p className="text-[12px] text-zinc-400 mt-3">
        Module access is managed in the Admin module. Users without Assets access don't appear here.
      </p>
    </div>
  )
}
