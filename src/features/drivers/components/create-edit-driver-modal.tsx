import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth'
import { driversApi } from '@/features/drivers/api/drivers-api'
import { useDepartments } from '@/features/departments'
import { useUsers } from '@/features/users'
import type { Driver } from '@/features/drivers/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { Modal } from '@/shared/ui/modal'

const driverSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  licenseNumber: z.string().min(2, 'License number is required'),
  licenseClass: z.string().min(1, 'License class is required'),
  licenseExpiry: z.string().min(1, 'License expiry is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  userId: z.string().optional(),
  notes: z.string().optional(),
})

type DriverForm = z.infer<typeof driverSchema>

const FORM_ID = 'create-edit-driver-form'

const formDefaults: DriverForm = {
  name: '',
  licenseNumber: '',
  licenseClass: '',
  licenseExpiry: '',
  phone: '',
  email: '',
  employeeId: '',
  departmentId: '',
  status: 'active',
  userId: '',
  notes: '',
}

interface CreateEditDriverModalProps {
  open: boolean
  onClose: () => void
  driver?: Driver | null
  onSaved?: () => void
}

export function CreateEditDriverModal({ open, onClose, driver, onSaved }: CreateEditDriverModalProps) {
  const isEdit = !!driver
  const currentUser = useAuthStore((s) => s.user)
  const { data: departments = [] } = useDepartments()
  const { data: users = [] } = useUsers()

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  )
  const userOptions = useMemo(
    () => [
      { value: '', label: 'No system login (driver only)' },
      ...users
        .filter((u) => u.status === 'active')
        .map((u) => ({ value: u.id, label: `${u.name} — ${u.email}` })),
    ],
    [users],
  )

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: formDefaults,
  })

  useEffect(() => {
    if (!open) return
    if (isEdit && driver) {
      reset({
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        licenseClass: driver.licenseClass,
        licenseExpiry: driver.licenseExpiry,
        phone: driver.phone ?? '',
        email: driver.email ?? '',
        employeeId: driver.employeeId ?? '',
        departmentId: driver.departmentId ?? '',
        status: driver.status,
        userId: driver.userId ?? '',
        notes: driver.notes ?? '',
      })
    } else {
      reset(formDefaults)
    }
  }, [open, isEdit, driver, reset])

  const createMutation = useMutation({
    mutationFn: (input: DriverForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return driversApi.create({
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseClass: input.licenseClass,
        licenseExpiry: input.licenseExpiry,
        phone: input.phone || undefined,
        email: input.email || undefined,
        employeeId: input.employeeId || undefined,
        departmentId: input.departmentId || undefined,
        status: input.status,
        userId: input.userId || undefined,
        notes: input.notes || undefined,
        createdBy: currentUser.id,
      })
    },
    onSuccess: (created) => {
      toast.success(`Added ${created.name}`)
      onSaved?.()
    },
    onError: (err) => {
      toast.error('Add driver failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: DriverForm) => {
      if (!currentUser || !driver) throw new Error('Driver or signed-in user missing')
      return driversApi.update(driver.id, {
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseClass: input.licenseClass,
        licenseExpiry: input.licenseExpiry,
        phone: input.phone || undefined,
        email: input.email || undefined,
        employeeId: input.employeeId || undefined,
        departmentId: input.departmentId || undefined,
        status: input.status,
        userId: input.userId || undefined,
        notes: input.notes || undefined,
        updatedBy: currentUser.id,
      })
    },
    onSuccess: (updated) => {
      toast.success(`Updated ${updated.name}`)
      onSaved?.()
    },
    onError: (err) => {
      toast.error('Update failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    },
  })

  const busy = createMutation.isPending || updateMutation.isPending
  const onSubmit = (values: DriverForm) => {
    if (isEdit) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose() }}
      title={isEdit ? `Edit Driver — ${driver!.name}` : 'Add Driver'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID} loading={busy}>{isEdit ? 'Save Changes' : 'Add Driver'}</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name *" placeholder="e.g. Ramon Cruz" {...register('name')} error={errors.name?.message} />
          <Input label="Employee ID" placeholder="e.g. EMP-104 (optional)" {...register('employeeId')} />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">License</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="License Number *"
              placeholder="e.g. N12-19-001847"
              {...register('licenseNumber')}
              error={errors.licenseNumber?.message}
            />
            <Input
              label="License Expiry *"
              type="date"
              {...register('licenseExpiry')}
              error={errors.licenseExpiry?.message}
            />
          </div>
          <Input
            label="License Class *"
            placeholder="e.g. Restriction 1,2,3 (PH) or CDL Class A (US)"
            {...register('licenseClass')}
            error={errors.licenseClass?.message}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Contact</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" placeholder="+63 917 555 0000" {...register('phone')} />
            <Input label="Email" type="email" placeholder="optional" {...register('email')} error={errors.email?.message} />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Assignment</legend>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Department"
              placeholder="Select department"
              {...register('departmentId')}
              options={departmentOptions}
            />
            <Select
              label="Status *"
              {...register('status')}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              error={errors.status?.message}
            />
          </div>
          <Select
            label="System Login (optional)"
            {...register('userId')}
            options={userOptions}
          />
          <p className="text-[11px] text-zinc-400 -mt-1">
            Link to a User account if this driver also signs in to manage trips, fuel, or maintenance.
            Most drivers leave this blank.
          </p>
        </fieldset>

        <Textarea
          label="Notes"
          rows={2}
          placeholder="e.g. Heavy-vehicle qualified. Preferred for long-haul."
          {...register('notes')}
        />
      </form>
    </Modal>
  )
}
