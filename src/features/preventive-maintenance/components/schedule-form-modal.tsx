import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { preventiveSchedulesApi } from '@/features/preventive-maintenance/api/preventive-schedules-api'
import type { PreventiveSchedule } from '@/features/preventive-maintenance/types'
import { useAssets } from '@/features/assets'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'

const schema = z
  .object({
    title: z.string().min(2, 'Title is required'),
    assetId: z.string().min(1, 'Asset is required'),
    intervalUnit: z.enum(['days', 'weeks', 'months', 'hours', 'kilometers', 'cycles']),
    intervalValue: z.number().int().positive('Must be > 0'),
    lastServiceDate: z.string().min(1, 'Last service date is required'),
    lastServiceMeter: z.number().nonnegative('Cannot be negative').optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    defaultAssigneeId: z.string().min(1, 'Technician is required'),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const usage = data.intervalUnit === 'hours' || data.intervalUnit === 'kilometers' || data.intervalUnit === 'cycles'
      return !usage || data.lastServiceMeter !== undefined
    },
    { message: 'Last service meter is required for usage-based intervals', path: ['lastServiceMeter'] },
  )

type ScheduleForm = z.infer<typeof schema>

interface ScheduleFormModalProps {
  open: boolean
  onClose: () => void
  schedule: PreventiveSchedule | null
  onSaved: () => void
}

export function ScheduleFormModal({ open, onClose, schedule, onSaved }: ScheduleFormModalProps) {
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()
  const currentUser = useAuthStore((s) => s.user)
  const isEditing = !!schedule

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ScheduleForm>({
    resolver: zodResolver(schema),
    defaultValues: { intervalUnit: 'months', intervalValue: 1, priority: 'medium' },
  })

  const watchedUnit = useWatch({ control, name: 'intervalUnit' })
  const isUsageMode =
    watchedUnit === 'hours' || watchedUnit === 'kilometers' || watchedUnit === 'cycles'

  useEffect(() => {
    if (!open) return
    if (schedule) {
      reset({
        title: schedule.title,
        assetId: schedule.assetId,
        intervalUnit: schedule.intervalUnit,
        intervalValue: schedule.intervalValue,
        lastServiceDate: schedule.lastServiceDate,
        lastServiceMeter: schedule.lastServiceMeter,
        priority: schedule.priority,
        defaultAssigneeId: schedule.defaultAssigneeId,
        notes: schedule.notes ?? '',
      })
    } else {
      reset({
        title: '',
        assetId: '',
        intervalUnit: 'months',
        intervalValue: 1,
        lastServiceDate: '',
        lastServiceMeter: undefined,
        priority: 'medium',
        defaultAssigneeId: '',
        notes: '',
      })
    }
  }, [open, schedule, reset])

  const saveMutation = useMutation({
    mutationFn: (data: ScheduleForm) => {
      if (!currentUser) throw new Error('Not signed in')
      if (isEditing && schedule) {
        return preventiveSchedulesApi.update(
          schedule.id,
          {
            title: data.title,
            intervalUnit: data.intervalUnit,
            intervalValue: data.intervalValue,
            lastServiceDate: data.lastServiceDate,
            lastServiceMeter: data.lastServiceMeter,
            priority: data.priority,
            defaultAssigneeId: data.defaultAssigneeId,
            notes: data.notes,
          },
          currentUser.id,
        )
      }
      return preventiveSchedulesApi.create({
        title: data.title,
        assetId: data.assetId,
        intervalUnit: data.intervalUnit,
        intervalValue: data.intervalValue,
        lastServiceDate: data.lastServiceDate,
        lastServiceMeter: data.lastServiceMeter,
        priority: data.priority,
        defaultAssigneeId: data.defaultAssigneeId,
        notes: data.notes,
        createdBy: currentUser.id,
      })
    },
    onSuccess: (s) => {
      toast.success(isEditing ? `${s.id} updated` : `Created ${s.id}`)
      onSaved()
      onClose()
    },
    onError: (err) =>
      toast.error('Save failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      }),
  })

  const onSubmit = (data: ScheduleForm) => saveMutation.mutate(data)

  const activeAssets = assets.filter((a) => a.status !== 'disposed')
  const activeUsers = users.filter((u) => u.status === 'active')

  const subjectOptions = activeAssets.map((a) => ({ value: a.id, label: `${a.name} (${a.serialNumber})` }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${schedule?.id}` : 'New Preventive Schedule'}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" loading={saveMutation.isPending}>
            {isEditing ? 'Save changes' : 'Create schedule'}
          </Button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Title *"
          {...register('title')}
          error={errors.title?.message}
          placeholder="e.g. Engine oil & filter service"
        />
        <Select
          label="Asset *"
          {...register('assetId')}
          error={errors.assetId?.message}
          placeholder="Select asset"
          disabled={isEditing}
          options={subjectOptions}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Every *"
            type="number"
            min={1}
            {...register('intervalValue', { valueAsNumber: true })}
            error={errors.intervalValue?.message}
          />
          <Select
            label="Unit *"
            {...register('intervalUnit')}
            error={errors.intervalUnit?.message}
            options={[
              { value: 'days', label: 'Days' },
              { value: 'weeks', label: 'Weeks' },
              { value: 'months', label: 'Months' },
              { value: 'hours', label: 'Hours (meter)' },
              { value: 'kilometers', label: 'Kilometers (meter)' },
              { value: 'cycles', label: 'Cycles (meter)' },
            ]}
          />
          <Input
            label="Last Service *"
            type="date"
            {...register('lastServiceDate')}
            error={errors.lastServiceDate?.message}
          />
        </div>
        {isUsageMode && (
          <Input
            label={`Last Service Meter * (${watchedUnit})`}
            type="number"
            min={0}
            step="1"
            {...register('lastServiceMeter', { valueAsNumber: true })}
            error={errors.lastServiceMeter?.message}
            helperText="Asset's meter reading at the time of last service. Next due fires at this + Every."
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority *"
            {...register('priority')}
            error={errors.priority?.message}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />
          <Select
            label="Default Technician *"
            {...register('defaultAssigneeId')}
            error={errors.defaultAssigneeId?.message}
            placeholder="Select technician"
            options={activeUsers.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>
        <Textarea label="Notes" {...register('notes')} rows={2} />
      </form>
    </Modal>
  )
}
