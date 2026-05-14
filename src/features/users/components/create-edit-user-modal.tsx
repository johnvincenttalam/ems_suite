import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserRoundCheck, X } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { usersApi, nextEmployeeId } from '@/features/users/api/users-api'
import { useUsers } from '@/features/users/hooks/use-users'
import { useDepartments } from '@/features/departments'
import { modules, type ModuleKey } from '@/config/modules'
import type { ModuleRole, User } from '@/features/users/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { cn } from '@/shared/utils/cn'
type RoleChoice = 'none' | 'member' | 'manager' | 'admin'

const userSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  // Per-module role picker — 'none' means no access.
  moduleRoles: z.record(z.string(), z.enum(['none', 'member', 'manager', 'admin'])),
})

type UserForm = z.infer<typeof userSchema>

const ROLE_OPTIONS: { value: RoleChoice; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'member', label: 'Member' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]

function rolesToForm(roles: Partial<Record<ModuleKey, ModuleRole>>): Record<string, RoleChoice> {
  const out: Record<string, RoleChoice> = {}
  for (const m of modules) {
    out[m.key] = (roles[m.key] as RoleChoice | undefined) ?? 'none'
  }
  return out
}

function formToRoles(form: Record<string, RoleChoice>): Partial<Record<ModuleKey, ModuleRole>> {
  const out: Partial<Record<ModuleKey, ModuleRole>> = {}
  for (const m of modules) {
    const choice = form[m.key]
    if (choice && choice !== 'none') out[m.key] = choice
  }
  return out
}

interface CreateEditUserModalProps {
  open: boolean
  onClose: () => void
  user?: User | null
  moduleKey: ModuleKey
  auditModule: string
  moduleLabel: string
  onSaved?: () => void
}

export function CreateEditUserModal({
  open,
  onClose,
  user,
  moduleKey,
  moduleLabel,
  onSaved,
}: CreateEditUserModalProps) {
  const isEdit = !!user
  const { user: currentUser } = useAuthStore()
  const { data: departments = [] } = useDepartments()
  const { data: allUsers = [] } = useUsers()
  // When an SDMS admin types an Employee ID that already belongs to someone in
  // the system, we switch this modal from "create new" to "grant access to
  // existing employee" — same form, different submit path.
  const [claimedUserId, setClaimedUserId] = useState<string | null>(null)

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.id })),
    [departments],
  )

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]

  const { register, handleSubmit, formState: { errors }, reset, control, setValue } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      departmentId: '',
      position: '',
      status: 'active',
      moduleRoles: {},
    },
  })

  const watchedEmployeeId = useWatch({ control, name: 'employeeId' })

  // Existing employee suggestion — only meaningful while creating, and only
  // when the typed ID doesn't already belong to the user we've claimed.
  const suggestedExistingUser = useMemo(() => {
    if (isEdit) return null
    if (!watchedEmployeeId || watchedEmployeeId.trim().length < 2) return null
    const match = allUsers.find(
      (u) => (u.employeeId ?? '').toLowerCase() === watchedEmployeeId.trim().toLowerCase(),
    )
    if (!match) return null
    return match
  }, [isEdit, watchedEmployeeId, allUsers])

  const claimedUser = useMemo(
    () => (claimedUserId ? allUsers.find((u) => u.id === claimedUserId) ?? null : null),
    [claimedUserId, allUsers],
  )

  const useExistingEmployee = (u: User) => {
    setClaimedUserId(u.id)
    setValue('employeeId', u.employeeId ?? '', { shouldDirty: true })
    setValue('name', u.name, { shouldDirty: true })
    setValue('email', u.email, { shouldDirty: true })
    setValue('phone', u.phone ?? '', { shouldDirty: true })
    setValue('departmentId', u.departmentId ?? '', { shouldDirty: true })
    setValue('position', u.position ?? '', { shouldDirty: true })
    setValue('status', u.status, { shouldDirty: true })
    // Keep the user's existing module roles, then add this module as a member
    // by default — admin can change it before submitting.
    const merged = rolesToForm(u.moduleRoles ?? {})
    if (merged[moduleKey] === 'none') merged[moduleKey] = 'member'
    setValue('moduleRoles', merged, { shouldDirty: true })
  }

  const unclaimEmployee = () => {
    setClaimedUserId(null)
    const seedRoles: Record<string, RoleChoice> = {}
    for (const m of modules) seedRoles[m.key] = m.key === moduleKey ? 'member' : 'none'
    reset({
      employeeId: nextEmployeeId(),
      name: '',
      email: '',
      phone: '',
      departmentId: '',
      position: '',
      status: 'active',
      moduleRoles: seedRoles,
    })
  }

  useEffect(() => {
    if (!open) {
      setClaimedUserId(null)
      return
    }
    setClaimedUserId(null)
    if (isEdit && user) {
      reset({
        employeeId: user.employeeId ?? '',
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
        departmentId: user.departmentId ?? '',
        position: user.position ?? '',
        status: user.status,
        moduleRoles: rolesToForm(user.moduleRoles ?? {}),
      })
    } else {
      const seedRoles: Record<string, RoleChoice> = {}
      for (const m of modules) seedRoles[m.key] = m.key === moduleKey ? 'member' : 'none'
      reset({
        employeeId: nextEmployeeId(),
        name: '',
        email: '',
        phone: '',
        departmentId: '',
        position: '',
        status: 'active',
        moduleRoles: seedRoles,
      })
    }
  }, [open, isEdit, user, moduleKey, reset])

  const createMutation = useMutation({
    mutationFn: (input: UserForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return usersApi.create({
        name: input.name,
        email: input.email,
        phone: input.phone ?? '',
        employeeId: input.employeeId,
        departmentId: input.departmentId,
        position: input.position,
        status: input.status,
        moduleRoles: formToRoles(input.moduleRoles as Record<string, RoleChoice>),
        createdBy: currentUser.id,
      })
    },
    onSuccess: (created) => {
      toast.success(`Created ${created.name}`)
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      toast.error('Create failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UserForm) => {
      if (!currentUser) throw new Error('Not signed in')
      const targetId = user?.id ?? claimedUser?.id
      if (!targetId) throw new Error('No user to update')
      return usersApi.update(targetId, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        employeeId: input.employeeId,
        departmentId: input.departmentId,
        position: input.position,
        status: input.status,
        moduleRoles: formToRoles(input.moduleRoles as Record<string, RoleChoice>),
        updatedBy: currentUser.id,
      })
    },
    onSuccess: (updated) => {
      toast.success(
        claimedUser
          ? `Granted ${updated.name} ${moduleLabel} access`
          : `Updated ${updated.name}`,
      )
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const busy = createMutation.isPending || updateMutation.isPending

  const close = () => {
    if (busy) return
    onClose()
  }

  const onSubmit = (values: UserForm) => {
    if (isEdit || claimedUser) {
      updateMutation.mutate(values)
    } else {
      createMutation.mutate(values)
    }
  }

  const title = isEdit
    ? 'Edit User'
    : claimedUser
      ? `Grant ${moduleLabel} access`
      : 'Create User'

  const submitLabel = isEdit
    ? 'Save Changes'
    : claimedUser
      ? `Grant ${moduleLabel} access`
      : 'Create User'

  // Existing-employee personal fields are read-only — the SDMS admin shouldn't
  // mutate someone else's master record while granting access.
  const lockPersonalFields = !!claimedUser

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        {claimedUser && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
            <UserRoundCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium">Adding {claimedUser.name} to {moduleLabel}</p>
              <p className="text-[11.5px] text-emerald-800/80 mt-0.5">
                Their existing record stays as-is — only the Module Access section below applies.
              </p>
            </div>
            <button
              type="button"
              onClick={unclaimEmployee}
              className="text-emerald-700/70 hover:text-emerald-900 transition-colors"
              aria-label="Cancel — create a brand new user instead"
              title="Cancel — create a brand new user instead"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Employee ID"
              placeholder="e.g. EMP-009"
              {...register('employeeId')}
              error={errors.employeeId?.message}
              disabled={lockPersonalFields}
            />
            {suggestedExistingUser && !claimedUser && (
              <button
                type="button"
                onClick={() => useExistingEmployee(suggestedExistingUser)}
                className="w-full mt-1.5 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 hover:border-blue-300 text-left transition-colors"
              >
                <UserRoundCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-[11.5px] text-blue-900 min-w-0 flex-1 truncate">
                  <span className="font-medium">{suggestedExistingUser.name}</span>
                  <span className="text-blue-700/80"> — {suggestedExistingUser.email}</span>
                </span>
                <span className="text-[11px] text-blue-700 font-medium flex-shrink-0">Use this</span>
              </button>
            )}
          </div>
          <Input
            label="Name *"
            placeholder="e.g. Alex Rivera"
            {...register('name')}
            error={errors.name?.message}
            disabled={lockPersonalFields}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email *"
            type="email"
            placeholder="alex.rivera@example.com"
            {...register('email')}
            error={errors.email?.message}
            disabled={lockPersonalFields}
          />
          <Input
            label="Phone"
            placeholder="Optional"
            {...register('phone')}
            error={errors.phone?.message}
            disabled={lockPersonalFields}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Department"
            placeholder="Select department"
            options={departmentOptions}
            {...register('departmentId')}
            error={errors.departmentId?.message}
            disabled={lockPersonalFields}
          />
          <Input
            label="Position"
            placeholder="e.g. Operations Manager"
            {...register('position')}
            error={errors.position?.message}
            disabled={lockPersonalFields}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Status"
            options={statusOptions}
            {...register('status')}
            error={errors.status?.message}
            disabled={lockPersonalFields}
          />
        </div>

        <div>
          <p className="text-[13px] font-medium text-zinc-700 mb-1">Module Access</p>
          <p className="text-[12px] text-zinc-500 mb-3">
            One account works across every module. You can only set the <strong>{moduleLabel}</strong> role here —
            other modules are managed by their own admins and shown as read-only.
          </p>
          <Controller
            name="moduleRoles"
            control={control}
            render={({ field }) => {
              const value = (field.value ?? {}) as Record<string, RoleChoice>
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modules.map((m) => {
                    const isEditable = m.key === moduleKey
                    const current = value[m.key] ?? 'none'
                    const currentLabel = ROLE_OPTIONS.find((o) => o.value === current)?.label ?? 'No access'
                    return (
                      <div
                        key={m.key}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg border bg-white',
                          isEditable ? 'border-zinc-300' : 'border-zinc-200/60',
                        )}
                      >
                        <span
                          className={cn(
                            'text-[13px] flex-1 min-w-0 truncate',
                            isEditable ? 'text-zinc-900 font-medium' : 'text-zinc-500',
                          )}
                        >
                          {m.shortName}
                          {isEditable && <span className="text-[10.5px] text-zinc-400 ml-1.5 font-normal">(this module)</span>}
                        </span>
                        {isEditable ? (
                          <select
                            value={current}
                            onChange={(e) => field.onChange({ ...value, [m.key]: e.target.value as RoleChoice })}
                            className="h-8 rounded-md border border-zinc-200 bg-white text-[12.5px] px-2 text-zinc-700 hover:border-zinc-400 focus:outline-none focus:border-zinc-900"
                          >
                            {ROLE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="h-8 inline-flex items-center px-2 text-[12.5px] text-zinc-400">
                            {currentLabel}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
        </div>
      </form>
    </Modal>
  )
}
