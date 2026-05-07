import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Crown,
  IdCard,
  Mail,
  Pencil,
  Phone,
  UserX,
} from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { ModuleKey } from '@/config/modules'
import { getModulePath } from '@/config/modules'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { isModuleAdmin } from '@/features/auth'
import { useDepartments } from '@/features/departments'
import { useAuditLog } from '@/features/audit-log'
import { useUsers } from '@/features/users/hooks/use-users'
import { usersApi } from '@/features/users/api/users-api'
import { CreateEditUserModal } from '@/features/users/components/create-edit-user-modal'
import { ModuleAccessPills } from '@/features/users/components/module-access-pills'
import type { User } from '@/features/users/types'
import { Avatar } from '@/shared/ui/avatar'
import { Spinner } from '@/shared/ui/spinner'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { cn } from '@/shared/utils/cn'

/** Maps moduleKey to the audit log's `module` field (which uses display names). */
const AUDIT_MODULE_NAME: Record<ModuleKey, string> = {
  mis: 'Admin',
  sdms: 'Documents',
  inventory: 'Inventory',
  assets: 'Assets',
  fleet: 'Fleet',
  procurement: 'Procurement',
  maintenance: 'Maintenance',
}

const MODULE_LABEL: Record<ModuleKey, string> = {
  mis: 'MIS',
  sdms: 'SDMS',
  inventory: 'Inventory',
  assets: 'Assets',
  fleet: 'Fleet',
  procurement: 'Procurement',
  maintenance: 'Maintenance',
}

type ProfileTab = 'activity' | 'access'

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const selectedModule = useAuthStore((s) => s.selectedModule)
  const { user: currentUser } = useAuthStore()
  const { data: users = [], isLoading } = useUsers()
  const { data: departments = [] } = useDepartments()
  const { data: auditEntries = [] } = useAuditLog()

  const [tab, setTab] = useState<ProfileTab>('activity')
  const [editOpen, setEditOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [adminTarget, setAdminTarget] = useState<{ makeAdmin: boolean } | null>(null)

  const moduleKey: ModuleKey = (selectedModule ?? 'sdms') as ModuleKey
  const auditModuleName = AUDIT_MODULE_NAME[moduleKey] ?? MODULE_LABEL[moduleKey]
  const moduleLabel = MODULE_LABEL[moduleKey] ?? moduleKey

  const targetUser = useMemo(() => users.find((u) => u.id === id), [users, id])
  const dept = targetUser?.departmentId ? departments.find((d) => d.id === targetUser.departmentId) : undefined
  const isSelf = !!currentUser && targetUser?.id === currentUser.id
  const isAdminInModule = !!targetUser?.moduleAdmins.includes(moduleKey)
  const inModule = !!targetUser?.modules.includes(moduleKey)
  const canManage = isModuleAdmin(currentUser, moduleKey)

  const moduleActivity = useMemo(() => {
    if (!targetUser) return []
    return auditEntries
      .filter((e) => e.userId === targetUser.id && e.module === auditModuleName)
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [auditEntries, targetUser, auditModuleName])

  const totalActivity = useMemo(() => {
    if (!targetUser) return 0
    return auditEntries.filter((e) => e.userId === targetUser.id).length
  }, [auditEntries, targetUser])

  const lastActivity = moduleActivity[0]?.timestamp

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const revokeMutation = useMutation({
    mutationFn: () => {
      if (!currentUser || !targetUser) throw new Error('Not signed in')
      return usersApi.removeFromModule(targetUser.id, moduleKey, auditModuleName, currentUser.id)
    },
    onSuccess: () => {
      toast.success(`Revoked ${targetUser?.name ?? ''}'s ${moduleLabel} access`)
      invalidate()
      setRevokeOpen(false)
      navigate(getModulePath(moduleKey, 'users'))
    },
    onError: (err) => {
      toast.error('Revoke failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const adminMutation = useMutation({
    mutationFn: ({ makeAdmin }: { makeAdmin: boolean }) => {
      if (!currentUser || !targetUser) throw new Error('Not signed in')
      return usersApi.setModuleAdmin({
        userId: targetUser.id,
        moduleKey,
        auditModule: auditModuleName,
        makeAdmin,
        byId: currentUser.id,
      })
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.makeAdmin
          ? `${targetUser?.name ?? ''} is now a ${moduleLabel} admin`
          : `${targetUser?.name ?? ''} is no longer a ${moduleLabel} admin`,
      )
      invalidate()
      setAdminTarget(null)
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!targetUser) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60 p-12 text-center">
        <p className="text-base font-semibold text-zinc-900">User not found</p>
        <p className="text-[13px] text-zinc-500 mt-1">It may have been deleted, or the link is incorrect.</p>
        <button
          type="button"
          onClick={() => navigate(getModulePath(moduleKey, 'users'))}
          className="inline-flex items-center gap-1.5 mt-4 text-[13px] text-accent hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
      </div>
    )
  }

  const actionItems: ActionMenuItem[] = []
  if (canManage) {
    actionItems.push({ key: 'edit', label: 'Edit user', icon: Pencil, onClick: () => setEditOpen(true) })
    if (!isSelf && inModule) {
      if (isAdminInModule) {
        actionItems.push({
          key: 'demote',
          label: 'Remove as Admin',
          icon: Crown,
          description: 'Becomes a regular member',
          onClick: () => setAdminTarget({ makeAdmin: false }),
        })
      } else {
        actionItems.push({
          key: 'promote',
          label: 'Make Admin',
          icon: Crown,
          description: 'Can invite users and manage access',
          onClick: () => setAdminTarget({ makeAdmin: true }),
        })
        actionItems.push({
          key: 'revoke',
          label: 'Revoke access',
          icon: UserX,
          danger: true,
          onClick: () => setRevokeOpen(true),
        })
      }
    }
  }

  const tabs = [
    { value: 'activity', label: `${moduleLabel} Activity`, count: moduleActivity.length },
    { value: 'access', label: 'Access' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[12px] text-zinc-500">
        <button
          type="button"
          onClick={() => navigate(getModulePath(moduleKey, 'users'))}
          className="inline-flex items-center gap-1 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {moduleLabel} Users
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-700 font-medium">{targetUser.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <Avatar name={targetUser.name} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{targetUser.name}</h1>
              <StatusBadge status={targetUser.status} />
              {isAdminInModule && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-medium border border-violet-200">
                  <Crown className="w-3 h-3" />
                  {moduleLabel} Admin
                </span>
              )}
              {!inModule && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-medium border border-zinc-200">
                  No {moduleLabel} access
                </span>
              )}
            </div>
            <p className="text-[13px] text-zinc-500 mt-1">
              {targetUser.position ? <>{targetUser.position} · </> : null}
              {dept?.name ?? '—'}
            </p>
          </div>
        </div>
        {actionItems.length > 0 && <ActionMenu items={actionItems} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-white rounded-xl border border-zinc-200/60">
          <div className="px-5 pt-3">
            <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as ProfileTab)} />
          </div>
          <div className="p-5">
            {tab === 'activity' && (
              <ActivityTimeline entries={moduleActivity} moduleLabel={moduleLabel} />
            )}
            {tab === 'access' && (
              <AccessPanel user={targetUser} currentModule={moduleKey} />
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--topbar-h)+1rem)] lg:self-start">
          <section className="bg-white rounded-xl border border-zinc-200/60 p-4">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Contact</p>
            <ul className="space-y-2 text-[12px]">
              <li className="flex items-start gap-2 text-zinc-700">
                <Mail className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                <a href={`mailto:${targetUser.email}`} className="hover:underline truncate">{targetUser.email}</a>
              </li>
              {targetUser.phone && (
                <li className="flex items-start gap-2 text-zinc-700">
                  <Phone className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${targetUser.phone}`} className="hover:underline">{targetUser.phone}</a>
                </li>
              )}
              {targetUser.position && (
                <li className="flex items-start gap-2 text-zinc-700">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <span>{targetUser.position}</span>
                </li>
              )}
              {dept && (
                <li className="flex items-start gap-2 text-zinc-700">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <span>{dept.name}</span>
                </li>
              )}
              {targetUser.employeeId && (
                <li className="flex items-start gap-2 text-zinc-700">
                  <IdCard className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <span className="font-mono text-[11px]">{targetUser.employeeId}</span>
                </li>
              )}
              <li className="flex items-start gap-2 text-zinc-700">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>Joined {format(new Date(targetUser.createdAt), 'MMM d, yyyy')}</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-xl border border-zinc-200/60 p-4">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">Activity</p>
            <ul className="space-y-2 text-[12px]">
              <li className="flex justify-between text-zinc-700">
                <span>{moduleLabel} entries</span>
                <span className="tabular-nums font-medium">{moduleActivity.length}</span>
              </li>
              <li className="flex justify-between text-zinc-700">
                <span>All modules</span>
                <span className="tabular-nums font-medium">{totalActivity}</span>
              </li>
              {lastActivity && (
                <li className="flex justify-between text-zinc-700">
                  <span>Last seen</span>
                  <span className="text-zinc-500">{formatDistanceToNow(parseISO(lastActivity), { addSuffix: true })}</span>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <CreateEditUserModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={targetUser}
        moduleKey={moduleKey}
        auditModule={auditModuleName}
        moduleLabel={moduleLabel}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={revokeOpen}
        onCancel={() => setRevokeOpen(false)}
        onConfirm={() => revokeMutation.mutate()}
        title={`Revoke ${targetUser.name}'s ${moduleLabel} access?`}
        message={
          <>
            They will no longer see {moduleLabel} in their module list. Their access to other modules is unaffected.
            Their global user record stays so prior activity remains attributed to them.
          </>
        }
        confirmLabel="Revoke access"
        tone="danger"
        busy={revokeMutation.isPending}
      />

      <ConfirmDialog
        open={!!adminTarget}
        onCancel={() => setAdminTarget(null)}
        onConfirm={() => adminTarget && adminMutation.mutate({ makeAdmin: adminTarget.makeAdmin })}
        title={
          adminTarget?.makeAdmin
            ? `Make ${targetUser.name} a ${moduleLabel} admin?`
            : `Remove ${targetUser.name} as ${moduleLabel} admin?`
        }
        message={
          adminTarget?.makeAdmin ? (
            <>They will be able to invite users, manage access, and promote others. They keep their existing {moduleLabel} access.</>
          ) : (
            <>They will lose admin privileges (invite, revoke, promote) but keep their {moduleLabel} access. At least one admin must remain.</>
          )
        }
        confirmLabel={adminTarget?.makeAdmin ? 'Make admin' : 'Remove admin'}
        tone={adminTarget?.makeAdmin ? 'default' : 'warning'}
        busy={adminMutation.isPending}
      />
    </div>
  )
}

interface ActivityTimelineProps {
  entries: { id: string; userName: string; action: string; module: string; detail: string; timestamp: string }[]
  moduleLabel: string
}

function ActivityTimeline({ entries, moduleLabel }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-zinc-500">No {moduleLabel} activity recorded for this user yet.</p>
      </div>
    )
  }
  return (
    <ul className="relative space-y-3 pl-6">
      <span className="absolute left-[10px] top-1 bottom-1 w-px bg-zinc-200" aria-hidden />
      {entries.map((e) => {
        const tone =
          e.action === 'approve' ? 'bg-emerald-500'
          : e.action === 'reject' || e.action === 'delete' ? 'bg-red-500'
          : e.action === 'create' ? 'bg-blue-500'
          : 'bg-zinc-400'
        return (
          <li key={e.id} className="relative">
            <span className={cn('absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white', tone)} aria-hidden />
            <p className="text-[13px] text-zinc-900 font-medium capitalize">{e.action}</p>
            <p className="text-[12px] text-zinc-600">{e.detail}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {format(parseISO(e.timestamp), 'MMM d, yyyy HH:mm')}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function AccessPanel({ user, currentModule }: { user: User; currentModule: ModuleKey }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Module access</p>
        {user.modules.length === 0 ? (
          <p className="text-[13px] text-zinc-500">No module access.</p>
        ) : (
          <ul className="space-y-2">
            {user.modules.map((m) => {
              const isAdmin = user.moduleAdmins.includes(m)
              return (
                <li key={m} className="flex items-center justify-between rounded-md border border-zinc-200/60 bg-zinc-50/40 px-3 py-2">
                  <span className="text-[13px] font-medium text-zinc-900">{MODULE_LABEL[m] ?? m}</span>
                  <span className="flex items-center gap-2">
                    {isAdmin && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-medium border border-violet-200">
                        <Crown className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    )}
                    {m === currentModule && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                        Current
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">Cross-module access</p>
        <ModuleAccessPills modules={user.modules} excludeModule={currentModule} />
        {user.modules.filter((m) => m !== currentModule).length === 0 && (
          <p className="text-[12px] text-zinc-500">No access to other modules.</p>
        )}
      </div>
    </div>
  )
}
