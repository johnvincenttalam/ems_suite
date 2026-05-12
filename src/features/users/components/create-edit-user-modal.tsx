import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { usersApi, nextEmployeeId } from '@/features/users/api/users-api'
import { useDepartments } from '@/features/departments'
import { modules, type ModuleKey } from '@/config/modules'
import type { ModuleRole, User } from '@/features/users/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
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
  onSaved,
}: CreateEditUserModalProps) {
  const isEdit = !!user
  const { user: currentUser } = useAuthStore()
  const { data: departments = [] } = useDepartments()

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.id })),
    [departments],
  )

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<UserForm>({
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

  useEffect(() => {
    if (!open) return
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
      return usersApi.update(user!.id, {
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
      toast.success(`Updated ${updated.name}`)
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
    if (isEdit) {
      updateMutation.mutate(values)
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'Edit User' : `Create User`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            placeholder="e.g. EMP-009"
            {...register('employeeId')}
            error={errors.employeeId?.message}
          />
          <Input
            label="Name *"
            placeholder="e.g. Alex Rivera"
            {...register('name')}
            error={errors.name?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email *"
            type="email"
            placeholder="alex.rivera@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Phone"
            placeholder="Optional"
            {...register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Department"
            placeholder="Select department"
            options={departmentOptions}
            {...register('departmentId')}
            error={errors.departmentId?.message}
          />
          <Input
            label="Position"
            placeholder="e.g. Operations Manager"
            {...register('position')}
            error={errors.position?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Status"
            options={statusOptions}
            {...register('status')}
            error={errors.status?.message}
          />
        </div>

        <div>
          <p className="text-[13px] font-medium text-zinc-700 mb-1">Module Access</p>
          <p className="text-[12px] text-zinc-500 mb-3">
            Pick a role per module. Admin manages the module; manager reviews / approves; member is day-to-day access.
          </p>
          <Controller
            name="moduleRoles"
            control={control}
            render={({ field }) => {
              const value = (field.value ?? {}) as Record<string, RoleChoice>
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modules.map((m) => (
                    <div key={m.key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-200/60 bg-white">
                      <span className="text-[13px] text-zinc-700 flex-1 min-w-0 truncate">{m.shortName}</span>
                      <select
                        value={value[m.key] ?? 'none'}
                        onChange={(e) => field.onChange({ ...value, [m.key]: e.target.value as RoleChoice })}
                        className="h-8 rounded-md border border-zinc-200 bg-white text-[12.5px] px-2 text-zinc-700 hover:border-zinc-400 focus:outline-none focus:border-zinc-900"
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )
            }}
          />
        </div>
      </form>
    </Modal>
  )
}
