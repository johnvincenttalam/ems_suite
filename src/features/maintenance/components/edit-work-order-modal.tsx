import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import type { WorkOrder, WorkOrderPriority, WorkOrderType } from '@/features/maintenance/types'

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['preventive', 'corrective', 'inspection']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
})

type EditForm = z.infer<typeof schema>

interface EditWorkOrderModalProps {
  open: boolean
  wo: WorkOrder | null
  loading: boolean
  onClose: () => void
  onConfirm: (patch: { title: string; description?: string; type: WorkOrderType; priority: WorkOrderPriority }) => void
}

export function EditWorkOrderModal({ open, wo, loading, onClose, onConfirm }: EditWorkOrderModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'preventive', priority: 'medium' },
  })

  useEffect(() => {
    if (!open || !wo) return
    reset({
      title: wo.title,
      description: wo.description ?? '',
      type: wo.type,
      priority: wo.priority,
    })
  }, [open, wo, reset])

  const onSubmit = (data: EditForm) =>
    onConfirm({
      title: data.title,
      description: data.description?.trim() || undefined,
      type: data.type,
      priority: data.priority,
    })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${wo?.id ?? ''}`}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-work-order-form" loading={loading}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-work-order-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-[12.5px] text-zinc-500">
          Asset, technician, and schedule have dedicated actions — reassign and reschedule from the row menu.
        </p>
        <Input label="Title *" {...register('title')} error={errors.title?.message} />
        <Textarea label="Description" {...register('description')} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type *"
            {...register('type')}
            error={errors.type?.message}
            options={[
              { value: 'preventive', label: 'Preventive' },
              { value: 'corrective', label: 'Corrective' },
              { value: 'inspection', label: 'Inspection' },
            ]}
          />
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
        </div>
      </form>
    </Modal>
  )
}
