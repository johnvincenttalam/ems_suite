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
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { Users, ShieldCheck, Wrench, UserPlus, UserX, Crown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers, CreateEditUserModal, ModuleAccessPills } from '@/features/users'
import { usersApi } from '@/features/users/api/users-api'
import type { User } from '@/features/users/types'
import { useWorkOrders } from '@/features/maintenance'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { isModuleAdmin, userModules } from '@/features/auth'
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
  openCount: number
  overdueCount: number
  completedCount: number
}

export function MaintenanceUsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: allUsers = [], isLoading } = useUsers()
  const { data: workOrders = [] } = useWorkOrders()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [globalFilter, setGlobalFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null)
  const [adminTarget, setAdminTarget] = useState<{ user: User; makeAdmin: boolean } | null>(null)

  const canManage = isModuleAdmin(currentUser, 'maintenance')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.setModuleRole({ userId, moduleKey: 'maintenance', role: null, auditModule: 'Maintenance', byId: currentUser.id })
    },
    onSuccess: (user) => {
      toast.success(`Revoked ${user.name}'s Maintenance access`)
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
      return usersApi.setModuleRole({
        userId,
        moduleKey: 'maintenance',
        auditModule: 'Maintenance',
        role: makeAdmin ? 'admin' : 'member',
        byId: currentUser.id,
      })
    },
    onSuccess: (user, vars) => {
      toast.success(vars.makeAdmin ? `${user.name} is now a Maintenance admin` : `${user.name} is no longer a Maintenance admin`)
      invalidate()
      setAdminTarget(null)
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const maintUsers = useMemo<UserActivity[]>(() => {
    const today = new Date()
    return allUsers
      .filter((u) => !!u.moduleRoles?.maintenance)
      .map((u) => {
        const assigned = workOrders.filter((w) => w.assignedTo === u.id)
        const open = assigned.filter((w) => w.status === 'pending' || w.status === 'ongoing')
        const overdue = open.filter((w) => differenceInCalendarDays(parseISO(w.scheduledDate), today) < 0)
        const completed = assigned.filter((w) => w.status === 'completed')
        return {
          ...u,
          openCount: open.length,
          overdueCount: overdue.length,
          completedCount: completed.length,
        }
      })
  }, [allUsers, workOrders])

  const stats = useMemo(() => {
    const total = maintUsers.length
    const active = maintUsers.filter((u) => u.status === 'active').length
    const withOpen = maintUsers.filter((u) => u.openCount > 0).length
    return { total, active, withOpen }
  }, [maintUsers])

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
                {isModuleAdmin(row.original, 'maintenance') && (
                  <span title="Maintenance module admin" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-medium border border-violet-200">
                    <Crown className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">{row.original.position ?? row.original.email}</p>
              <ModuleAccessPills modules={userModules(row.original)} excludeModule="maintenance" className="mt-1" />
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'employeeId',
        header: 'Employee ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-[12px] text-zinc-600">{(getValue() as string) || '—'}</span>
        ),
      },
      {
        accessorKey: 'openCount',
        header: 'Open',
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
        accessorKey: 'overdueCount',
        header: 'Overdue',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return v > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-medium border border-red-200">
              {v}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-300">—</span>
          )
        },
      },
      {
        accessorKey: 'completedCount',
        header: 'Completed',
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
          const isAdmin = isModuleAdmin(u, 'maintenance')
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
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <ActionMenu items={items} />
            </div>
          )
        },
      })
    }

    return base
  }, [canManage, currentUser?.id])

  const table = useReactTable({
    data: maintUsers,
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
        <PageHeader title="Maintenance Users" subtitle="Loading..." />
        <TableSkeleton columns={7} rows={6} />
      </div>
    )

  return (
    <div>
      <PageHeader
        title="Maintenance Users"
        subtitle={`${maintUsers.length} user${maintUsers.length === 1 ? '' : 's'} with maintenance access`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
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
          title="With Open Work"
          value={stats.withOpen}
          subtitle="Users with at least one open WO"
          icon={Wrench}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={2}
        />
      </div>

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search maintenance users...' }}
      >
        <ExportMenu
          rows={maintUsers as unknown as Record<string, unknown>[]}
          baseFilename="maintenance-users"
          sheetName="Maintenance Users"
          pdfTitle="Maintenance Users"
          pdfSubtitle={`${maintUsers.length} user${maintUsers.length === 1 ? '' : 's'} with maintenance access`}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'openCount', label: 'Open' },
            { key: 'overdueCount', label: 'Overdue' },
            { key: 'completedCount', label: 'Completed' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Created' },
          ]}
        />
        {canManage && (
          <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            Create User
          </Button>
        )}
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Users}
        emptyMessage="No maintenance users found"
        onRowClick={(row) => navigate(getModulePath('maintenance', `users/${row.id}`))}
      />

      <p className="text-[12px] text-zinc-400 mt-3">
        {canManage
          ? 'You can create users, edit details, and revoke Maintenance access. Other modules are managed by their own admins.'
          : 'Read-only view. Ask a Maintenance admin (look for the Admin badge) to manage users or change access.'}
      </p>

      <CreateEditUserModal
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null) }}
        user={editTarget}
        moduleKey="maintenance"
        auditModule="Maintenance"
        moduleLabel="Maintenance"
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
        title={`Revoke ${revokeTarget?.name ?? ''}'s Maintenance access?`}
        message={
          <>
            They will no longer see Maintenance in their module list. Their access to other modules is unaffected.
            Their global user record stays, so any work orders tied to them remain intact.
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
            ? `Make ${adminTarget?.user.name ?? ''} a Maintenance admin?`
            : `Remove ${adminTarget?.user.name ?? ''} as Maintenance admin?`
        }
        message={
          adminTarget?.makeAdmin ? (
            <>They will be able to invite users, manage access, and promote others. They keep their existing Maintenance access.</>
          ) : (
            <>They will lose admin privileges (invite, revoke, promote) but keep their Maintenance access. At least one admin must remain.</>
          )
        }
        confirmLabel={adminTarget?.makeAdmin ? 'Make admin' : 'Remove admin'}
        tone={adminTarget?.makeAdmin ? 'default' : 'warning'}
        busy={adminMutation.isPending}
      />
    </div>
  )
}
