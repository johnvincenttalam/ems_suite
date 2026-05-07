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
import { useNavigate } from 'react-router-dom'
import { getModulePath } from '@/config/modules'
import { format } from 'date-fns'
import { Users, ShieldCheck, UserCheck, UserPlus, UserX, Crown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers, CreateEditUserModal, ModuleAccessPills } from '@/features/users'
import { usersApi } from '@/features/users/api/users-api'
import type { User } from '@/features/users/types'
import { useAssetAssignments } from '@/features/assets'
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
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'

type UserActivity = User & {
  openAssignments: number
  totalAssignments: number
}

export function AssetsUsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: allUsers = [], isLoading } = useUsers()
  const { data: assignments = [] } = useAssetAssignments()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [globalFilter, setGlobalFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null)
  const [adminTarget, setAdminTarget] = useState<{ user: User; makeAdmin: boolean } | null>(null)

  const canManage = isModuleAdmin(currentUser, 'assets')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.removeFromModule(userId, 'assets', 'Assets', currentUser.id)
    },
    onSuccess: (user) => {
      toast.success(`Revoked ${user.name}'s Assets access`)
      invalidate()
      setRevokeTarget(null)
    },
    onError: (err) => {
      toast.error('Revoke failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const adminMutation = useMutation({
    mutationFn: ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.setModuleAdmin({
        userId,
        moduleKey: 'assets',
        auditModule: 'Assets',
        makeAdmin,
        byId: currentUser.id,
      })
    },
    onSuccess: (user, vars) => {
      toast.success(vars.makeAdmin ? `${user.name} is now an Assets admin` : `${user.name} is no longer an Assets admin`)
      invalidate()
      setAdminTarget(null)
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

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
                {row.original.moduleAdmins?.includes('assets') && (
                  <span title="Assets module admin" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-medium border border-violet-200">
                    <Crown className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">{row.original.position ?? row.original.email}</p>
              <ModuleAccessPills modules={row.original.modules} excludeModule="assets" className="mt-1" />
            </div>
          </div>
        ),
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
    ]

    if (canManage) {
      base.push({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const u = row.original
          const isSelf = u.id === currentUser?.id
          const isAdmin = u.moduleAdmins?.includes('assets')
          const items: ActionMenuItem[] = [
            { key: 'edit', label: 'Edit user', icon: Pencil, onClick: () => setEditTarget(u) },
          ]
          if (!isSelf) {
            if (isAdmin) {
              items.push({
                key: 'demote',
                label: 'Remove as Admin',
                icon: Crown,
                description: 'Becomes a regular member',
                onClick: () => setAdminTarget({ user: u, makeAdmin: false }),
              })
            } else {
              items.push({
                key: 'promote',
                label: 'Make Admin',
                icon: Crown,
                description: 'Can invite users and manage access',
                onClick: () => setAdminTarget({ user: u, makeAdmin: true }),
              })
              items.push({
                key: 'revoke',
                label: 'Revoke access',
                icon: UserX,
                danger: true,
                onClick: () => setRevokeTarget(u),
              })
            }
          }
          return (
            <div className="flex justify-end">
              <ActionMenu items={items} />
            </div>
          )
        },
      })
    }

    return base
  }, [canManage, currentUser?.id])

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
          <div className="flex items-center gap-2">
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
                <tr
                  key={row.id}
                  onClick={() => navigate(getModulePath('assets', `users/${row.original.id}`))}
                  className="border-b border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
                >
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
        {canManage
          ? 'You can create users, edit details, and revoke Assets access. Other modules are managed by their own admins.'
          : 'Read-only view. Ask an Assets admin (look for the Admin badge) to manage users or change access.'}
      </p>

      <CreateEditUserModal
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null) }}
        user={editTarget}
        moduleKey="assets"
        auditModule="Assets"
        moduleLabel="Assets"
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
        title={`Revoke ${revokeTarget?.name ?? ''}'s Assets access?`}
        message={
          <>
            They will no longer see Assets in their module list. Their access to other modules is unaffected.
            Their global user record stays, so any assignments tied to them remain intact.
          </>
        }
        confirmLabel="Revoke access"
        tone="danger"
        busy={revokeMutation.isPending}
      />

      <ConfirmDialog
        open={!!adminTarget}
        onCancel={() => setAdminTarget(null)}
        onConfirm={() =>
          adminTarget && adminMutation.mutate({ userId: adminTarget.user.id, makeAdmin: adminTarget.makeAdmin })
        }
        title={
          adminTarget?.makeAdmin
            ? `Make ${adminTarget?.user.name ?? ''} an Assets admin?`
            : `Remove ${adminTarget?.user.name ?? ''} as Assets admin?`
        }
        message={
          adminTarget?.makeAdmin ? (
            <>They will be able to invite users, manage access, and promote others. They keep their existing Assets access.</>
          ) : (
            <>They will lose admin privileges (invite, revoke, promote) but keep their Assets access. At least one admin must remain.</>
          )
        }
        confirmLabel={adminTarget?.makeAdmin ? 'Make admin' : 'Remove admin'}
        tone={adminTarget?.makeAdmin ? 'default' : 'warning'}
        busy={adminMutation.isPending}
      />
    </div>
  )
}
