import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getModulePath } from '@/config/modules'
import { format } from 'date-fns'
import { Users, ShieldCheck, ArrowLeftRight, UserPlus, UserX, Crown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers, CreateEditUserModal, ModuleAccessPills } from '@/features/users'
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
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatCard } from '@/shared/ui/stat-card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'

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
  const navigate = useNavigate()

  const [globalFilter, setGlobalFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null)
  const [adminTarget, setAdminTarget] = useState<{ user: User; makeAdmin: boolean } | null>(null)

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

  const adminMutation = useMutation({
    mutationFn: ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.setModuleAdmin({
        userId,
        moduleKey: 'inventory',
        auditModule: 'Inventory',
        makeAdmin,
        byId: currentUser.id,
      })
    },
    onSuccess: (user, vars) => {
      toast.success(vars.makeAdmin ? `${user.name} is now an Inventory admin` : `${user.name} is no longer an Inventory admin`)
      invalidate()
      setAdminTarget(null)
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
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
              <p className="text-xs text-zinc-400 truncate">{row.original.position ?? row.original.email}</p>
              <ModuleAccessPills modules={row.original.modules} excludeModule="inventory" className="mt-1" />
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

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search inventory users...' }}
      />

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Users}
        emptyMessage="No inventory users found"
        onRowClick={(user) => navigate(getModulePath('inventory', `users/${user.id}`))}
      />

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

      <ConfirmDialog
        open={!!adminTarget}
        onCancel={() => setAdminTarget(null)}
        onConfirm={() =>
          adminTarget && adminMutation.mutate({ userId: adminTarget.user.id, makeAdmin: adminTarget.makeAdmin })
        }
        title={
          adminTarget?.makeAdmin
            ? `Make ${adminTarget?.user.name ?? ''} an Inventory admin?`
            : `Remove ${adminTarget?.user.name ?? ''} as Inventory admin?`
        }
        message={
          adminTarget?.makeAdmin ? (
            <>They will be able to invite users, manage access, and promote others. They keep their existing Inventory access.</>
          ) : (
            <>They will lose admin privileges (invite, revoke, promote) but keep their Inventory access. At least one admin must remain.</>
          )
        }
        confirmLabel={adminTarget?.makeAdmin ? 'Make admin' : 'Remove admin'}
        tone={adminTarget?.makeAdmin ? 'default' : 'warning'}
        busy={adminMutation.isPending}
      />
    </div>
  )
}
