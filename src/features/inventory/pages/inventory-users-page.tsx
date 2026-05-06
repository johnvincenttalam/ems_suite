import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Users, ShieldCheck, ArrowLeftRight, UserPlus, UserX, Crown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers, CreateEditUserModal } from '@/features/users'
import { usersApi } from '@/features/users/api/users-api'
import type { User } from '@/features/users/types'
import { useStockMovements } from '@/features/inventory'
import { useAuditLog } from '@/features/audit-log'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { isModuleAdmin } from '@/features/auth'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { ExportMenu } from '@/shared/ui/export-menu'
import { PageHeader } from '@/shared/ui/page-header'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatCard } from '@/shared/ui/stat-card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type UserActivity = User & {
  movementsCount: number
  lastActionAt?: string
}

export function InventoryUsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: allUsers = [], isLoading } = useUsers()
  const { data: movements = [] } = useStockMovements()
  const { data: auditEntries = [] } = useAuditLog()
  const queryClient = useQueryClient()

  const [globalFilter, setGlobalFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null)

  const canManage = isModuleAdmin(currentUser, 'inventory')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.removeFromModule(userId, 'inventory', 'Inventory', currentUser.id)
    },
    onSuccess: (user) => {
      toast.success(`Revoked ${user.name}'s Inventory access`)
      invalidate()
      setRevokeTarget(null)
    },
    onError: (err) => {
      toast.error('Revoke failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const invUsers = useMemo<UserActivity[]>(() => {
    const invAudit = auditEntries.filter((e) => e.module === 'Inventory')
    return allUsers
      .filter((u) => u.modules.includes('inventory'))
      .map((u) => {
        const movementsCount = movements.filter((m) => m.createdBy === u.id).length
        const lastEntry = invAudit.find((e) => e.userId === u.id)
        return { ...u, movementsCount, lastActionAt: lastEntry?.timestamp }
      })
  }, [allUsers, movements, auditEntries])

  const stats = useMemo(() => {
    const total = invUsers.length
    const active = invUsers.filter((u) => u.status === 'active').length
    const withRecent = invUsers.filter((u) => !!u.lastActionAt).length
    return { total, active, withRecent }
  }, [invUsers])

  const columns = useMemo<ColumnDef<UserActivity>[]>(() => {
    const base: ColumnDef<UserActivity>[] = [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.original.name} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-zinc-900 truncate">{row.original.name}</p>
                {row.original.moduleAdmins?.includes('inventory') && (
                  <span title="Inventory module admin" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-medium border border-violet-200">
                    <Crown className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'movementsCount',
        header: 'Movements',
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
        accessorKey: 'lastActionAt',
        header: 'Last Activity',
        cell: ({ getValue }) => {
          const v = getValue() as string | undefined
          return v ? (
            <span className="text-[12px] text-zinc-600 whitespace-nowrap">
              {format(new Date(v), 'MMM dd, HH:mm')}
            </span>
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
    ]

    if (canManage) {
      base.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const u = row.original
          const isSelf = u.id === currentUser?.id
          const isAdmin = u.moduleAdmins?.includes('inventory')
          if (isSelf || isAdmin) {
            return <span className="text-[11px] text-zinc-300">—</span>
          }
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => setEditTarget(u)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<UserX className="w-3.5 h-3.5" />}
                onClick={() => setRevokeTarget(u)}
              >
                Revoke
              </Button>
            </div>
          )
        },
      })
    }

    return base
  }, [canManage, currentUser?.id])

  const table = useReactTable({
    data: invUsers,
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
        <PageHeader title="Inventory Users" subtitle="Loading..." />
        <TableSkeleton columns={6} rows={6} />
      </div>
    )

  return (
    <div>
      <PageHeader
        title="Inventory Users"
        subtitle={`${invUsers.length} user${invUsers.length === 1 ? '' : 's'} with inventory access`}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              rows={invUsers as unknown as Record<string, unknown>[]}
              baseFilename="inventory-users"
              sheetName="Inventory Users"
              pdfTitle="Inventory Users"
              pdfSubtitle={`${invUsers.length} user${invUsers.length === 1 ? '' : 's'} with inventory access`}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
                { key: 'movementsCount', label: 'Movements' },
                { key: 'lastActionAt', label: 'Last Activity' },
                { key: 'status', label: 'Status' },
                { key: 'createdAt', label: 'Created' },
              ]}
            />
            {canManage && (
              <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                Create User
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={0}
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={ShieldCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          index={1}
        />
        <StatCard
          title="Has Activity"
          value={stats.withRecent}
          subtitle="Users with at least one inventory event"
          icon={ArrowLeftRight}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          index={2}
        />
      </div>

      <div className="mb-4 max-w-sm">
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search inventory users..." />
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
                <DataTableEmpty colSpan={columns.length} icon={Users} message="No inventory users found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <p className="text-[12px] text-zinc-400 mt-3">
        {canManage
          ? 'You can create users, edit details, and revoke Inventory access. Other modules are managed by their own admins.'
          : 'Read-only view. Ask an Inventory admin (look for the Admin badge) to manage users or change access.'}
      </p>

      <CreateEditUserModal
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null) }}
        user={editTarget}
        moduleKey="inventory"
        auditModule="Inventory"
        moduleLabel="Inventory"
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
        title={`Revoke ${revokeTarget?.name ?? ''}'s Inventory access?`}
        message={
          <>
            They will no longer see Inventory in their module list. Their access to other modules is unaffected.
            Their global user record stays, so any movements they recorded remain attributed to them.
          </>
        }
        confirmLabel="Revoke access"
        tone="danger"
        busy={revokeMutation.isPending}
      />
    </div>
  )
}
