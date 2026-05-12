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
import { Users, ShieldCheck, FolderOpen, UserPlus, UserX, Crown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useUsers, CreateEditUserModal, ModuleAccessPills } from '@/features/users'
import { usersApi } from '@/features/users/api/users-api'
import type { User } from '@/features/users/types'
import { useDocuments } from '@/features/documents'
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
  authoredCount: number
  pendingSignatures: number
}

export function SdmsUsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: allUsers = [], isLoading } = useUsers()
  const { data: documents = [] } = useDocuments()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [globalFilter, setGlobalFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null)
  const [adminTarget, setAdminTarget] = useState<{ user: User; makeAdmin: boolean } | null>(null)

  const canManage = isModuleAdmin(currentUser, 'sdms')

  const sdmsUsers = useMemo<UserActivity[]>(() => {
    return allUsers
      .filter((u) => !!u.moduleRoles?.sdms)
      .map((u) => {
        const authoredCount = documents.filter((d) => d.createdBy === u.id).length
        const pendingSignatures = documents.filter(
          (d) =>
            d.status === 'in_review' &&
            d.approvers[d.currentApproverIndex ?? 0] === u.id,
        ).length
        return { ...u, authoredCount, pendingSignatures }
      })
  }, [allUsers, documents])

  const stats = useMemo(() => {
    const total = sdmsUsers.length
    const active = sdmsUsers.filter((u) => u.status === 'active').length
    const withPending = sdmsUsers.filter((u) => u.pendingSignatures > 0).length
    return { total, active, withPending }
  }, [sdmsUsers])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.setModuleRole({ userId, moduleKey: 'sdms', role: null, auditModule: 'Documents', byId: currentUser.id })
    },
    onSuccess: (user) => {
      toast.success(`Revoked ${user.name}'s SDMS access`)
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
        moduleKey: 'sdms',
        auditModule: 'Documents',
        role: makeAdmin ? 'admin' : 'member',
        byId: currentUser.id,
      })
    },
    onSuccess: (user, vars) => {
      toast.success(vars.makeAdmin ? `${user.name} is now an SDMS admin` : `${user.name} is no longer an SDMS admin`)
      invalidate()
      setAdminTarget(null)
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const columns = useMemo<ColumnDef<UserActivity>[]>(
    () => {
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
                  {isModuleAdmin(row.original, 'sdms') && (
                    <span title="SDMS module admin" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-medium border border-violet-200">
                      <Crown className="w-2.5 h-2.5" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate">{row.original.position ?? row.original.email}</p>
                <ModuleAccessPills modules={userModules(row.original)} excludeModule="sdms" className="mt-1" />
              </div>
            </div>
          ),
        },
        {
          accessorKey: 'phone',
          header: 'Phone',
          cell: ({ getValue }) => <span className="text-zinc-600 text-[13px]">{(getValue() as string) || '—'}</span>,
        },
        {
          accessorKey: 'authoredCount',
          header: 'Authored',
          cell: ({ getValue }) => (
            <span className="tabular-nums text-zinc-700">{getValue() as number}</span>
          ),
        },
        {
          accessorKey: 'pendingSignatures',
          header: 'Pending',
          cell: ({ getValue }) => {
            const v = getValue() as number
            return v > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                {v} to sign
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
            const isAdmin = isModuleAdmin(u, 'sdms')
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
    },
    [canManage, currentUser?.id],
  )

  const table = useReactTable({
    data: sdmsUsers,
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
        <PageHeader title="SDMS Users" subtitle="Loading..." />
        <TableSkeleton columns={7} rows={6} />
      </div>
    )

  return (
    <div>
      <PageHeader
        title="SDMS Users"
        subtitle={`${sdmsUsers.length} user${sdmsUsers.length === 1 ? '' : 's'} with SDMS access`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
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
          title="Awaiting Signatures"
          value={stats.withPending}
          subtitle="Users with documents in their queue"
          icon={FolderOpen}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={2}
        />
      </div>

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search SDMS users...' }}
      >
        <ExportMenu
          rows={sdmsUsers as unknown as Record<string, unknown>[]}
          baseFilename="sdms-users"
          sheetName="SDMS Users"
          pdfTitle="SDMS Users"
          pdfSubtitle={`${sdmsUsers.length} user${sdmsUsers.length === 1 ? '' : 's'} with SDMS access`}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'authoredCount', label: 'Authored' },
            { key: 'pendingSignatures', label: 'Pending Signatures' },
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
        emptyMessage="No SDMS users found"
        onRowClick={(row) => navigate(getModulePath('sdms', `users/${row.id}`))}
      />

      <p className="text-[12px] text-zinc-400 mt-3">
        {canManage
          ? 'You can create users, edit details, and revoke SDMS access. Other modules are managed by their own admins.'
          : 'Read-only view. Ask an SDMS admin (look for the Admin badge) to manage users or change access.'}
      </p>

      <CreateEditUserModal
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null) }}
        user={editTarget}
        moduleKey="sdms"
        auditModule="Documents"
        moduleLabel="SDMS"
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
        title={`Revoke ${revokeTarget?.name ?? ''}'s SDMS access?`}
        message={
          <>
            They will no longer see SDMS in their module list. Their access to other modules is unaffected.
            Their global user record stays, so any documents they authored or signed remain attributed to them.
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
            ? `Make ${adminTarget?.user.name ?? ''} an SDMS admin?`
            : `Remove ${adminTarget?.user.name ?? ''} as SDMS admin?`
        }
        message={
          adminTarget?.makeAdmin ? (
            <>
              They will be able to invite users, manage access, and promote others. They keep their existing SDMS access.
            </>
          ) : (
            <>
              They will lose admin privileges (invite, revoke, promote) but keep their SDMS access as a regular member.
              At least one admin must remain — this is blocked if they are the last one.
            </>
          )
        }
        confirmLabel={adminTarget?.makeAdmin ? 'Make admin' : 'Remove admin'}
        tone={adminTarget?.makeAdmin ? 'default' : 'warning'}
        busy={adminMutation.isPending}
      />
    </div>
  )
}

