import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Wrench, AlertTriangle, ArrowRight } from 'lucide-react'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { useAuthStore } from '@/features/auth'
import { useUsers } from '@/features/users'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import type { Issue } from '@/features/issues/types'
import { useCreateWorkOrderFromIssue } from '@/features/issues/hooks/use-issues'
import { severityToWorkOrderPriority } from '@/features/issues/lib/derive-priority'
import { formatIssueTarget } from '@/features/issues/lib/format-target'

const FORM_ID = 'create-wo-from-issue-form'

const schema = z.object({
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  assigneeUserId: z.string().min(1, 'Assign a technician'),
})

type FormValues = z.infer<typeof schema>

interface CreateWorkOrderFromIssueModalProps {
  open: boolean
  issue: Issue | null
  onClose: () => void
  onCreated?: (workOrderId: string) => void
}

export function CreateWorkOrderFromIssueModal({
  open,
  issue,
  onClose,
  onCreated,
}: CreateWorkOrderFromIssueModalProps) {
  const { user } = useAuthStore()
  const { data: users = [] } = useUsers()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()
  const createWO = useCreateWorkOrderFromIssue()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      scheduledDate: defaultScheduledDate(),
      assigneeUserId: '',
    },
  })

  useEffect(() => {
    if (open && issue) {
      reset({ scheduledDate: defaultScheduledDate(), assigneeUserId: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, issue?.id])

  const resolvedTarget = useMemo(() => {
    if (!issue) return { id: null as string | null, name: '', missing: false }
    if (issue.target.kind === 'asset') {
      const a = assets.find((x) => x.id === issue.target.id)
      return { id: issue.target.id, name: a?.name ?? issue.target.id, missing: !a }
    }
    const v = vehicles.find((x) => x.id === issue.target.id)
    if (!v) return { id: null, name: '', missing: true }
    return {
      id: v.id,
      name: `${v.plateNumber} · ${v.model}`,
      missing: false,
    }
  }, [issue, vehicles, assets])

  const targetInfo = issue ? formatIssueTarget(issue.target, { vehicles, assets }) : null

  const onSubmit = async (data: FormValues) => {
    if (!user || !issue) return
    try {
      const { workOrder } = await createWO.mutateAsync({
        issueId: issue.id,
        scheduledDate: data.scheduledDate,
        assigneeUserId: data.assigneeUserId,
        actorUserId: user.id,
      })
      toast.success(`Work order ${workOrder.id} created`)
      onCreated?.(workOrder.id)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create work order')
    }
  }

  if (!issue) return null

  const technicianOptions = users
    .filter((u) => u.status === 'active')
    .map((u) => ({ value: u.id, label: u.position ? `${u.name} — ${u.position}` : u.name }))

  const priority = severityToWorkOrderPriority(issue.severity)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Escalate to Work Order"
      size="md"
      footer={
        resolvedTarget.missing ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={isSubmitting}
              leftIcon={<Wrench className="w-4 h-4" />}
            >
              {isSubmitting ? 'Creating…' : 'Create Work Order'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/40 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-zinc-500 mb-1">
            <span className="font-mono text-[10.5px] text-zinc-400">{issue.id}</span>
            <ArrowRight className="w-3 h-3 text-zinc-300" />
            <span>New work order</span>
          </div>
          <p className="text-[13px] font-medium text-zinc-900">{issue.title}</p>
          <p className="text-[11.5px] text-zinc-500 mt-0.5">
            {issue.target.kind === 'vehicle' ? 'Vehicle' : 'Asset'} · {targetInfo?.label}
            {targetInfo?.sublabel && <span className="text-zinc-400"> · {targetInfo.sublabel}</span>}
          </p>
        </div>

        {resolvedTarget.missing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[12.5px] text-amber-900">
              <p className="font-medium">Target not found.</p>
              <p className="mt-1 text-amber-800">
                The asset or vehicle referenced by this issue could not be located.
              </p>
            </div>
          </div>
        ) : (
          <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <Field label={issue.target.kind === 'vehicle' ? 'Vehicle' : 'Asset'}>
                <span className="text-zinc-700">{resolvedTarget.name || resolvedTarget.id}</span>
              </Field>
              <Field label="Priority (from severity)">
                <span className="capitalize text-zinc-700">{priority}</span>
              </Field>
            </div>
            <Input
              label="Scheduled Date *"
              type="date"
              {...register('scheduledDate')}
              error={errors.scheduledDate?.message}
            />
            <Select
              label="Assign To *"
              {...register('assigneeUserId')}
              error={errors.assigneeUserId?.message}
              placeholder="Select technician"
              options={technicianOptions}
            />
            <p className="text-[11.5px] text-zinc-400">
              The issue will move to <strong className="text-zinc-600">In Progress</strong> and a
              new work order will appear under Maintenance — closing it later will let you resolve
              this issue with the same notes.
            </p>
          </form>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">
        {label}
      </p>
      <div className="text-[13px]">{children}</div>
    </div>
  )
}

function defaultScheduledDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
