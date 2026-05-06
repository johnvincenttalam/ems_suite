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
import type { User } from '@/features/users/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Checkbox } from '@/shared/ui/checkbox'

const userSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  modules: z.array(z.string()),
})

type UserForm = z.infer<typeof userSchema>

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
      modules: [moduleKey],
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
        modules: user.modules,
      })
    } else {
      reset({
        employeeId: nextEmployeeId(),
        name: '',
        email: '',
        phone: '',
        departmentId: '',
        position: '',
        status: 'active',
        modules: [moduleKey],
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
        modules: input.modules as ModuleKey[],
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
        modules: input.modules as ModuleKey[],
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
          <p className="text-[13px] font-medium text-zinc-700 mb-2">Module Access</p>
          <Controller
            name="modules"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {modules.map((m) => {
                  const checked = (field.value as string[]).includes(m.key)
                  return (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                      <Checkbox
                        checked={checked}
                        onChange={(on) => {
                          const next = on
                            ? [...field.value, m.key]
                            : (field.value as string[]).filter((k) => k !== m.key)
                          field.onChange(next)
                        }}
                      />
                      {m.shortName}
                    </label>
                  )
                })}
              </div>
            )}
          />
        </div>
      </form>
    </Modal>
  )
}
