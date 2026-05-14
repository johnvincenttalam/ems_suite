import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Select } from '@/shared/ui/select'
import { SearchableSelect } from '@/shared/ui/searchable-select'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import { useCreateIssue } from '@/features/issues/hooks/use-issues'
import type { IssueSeverity, IssueTarget, IssueTargetKind } from '@/features/issues/types'

const FORM_ID = 'report-issue-form'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  severity: z.enum(['minor', 'major', 'critical']),
  targetKind: z.enum(['vehicle', 'asset']),
  targetId: z.string().min(1, 'Select a vehicle or asset'),
})

type FormValues = z.infer<typeof schema>

interface ReportIssueModalProps {
  open: boolean
  onClose: () => void
  /** Pre-bound target. When provided, the target picker is hidden. */
  target?: IssueTarget
  /** Restrict the target picker to a single kind (e.g. only vehicles for the
   * Fleet Issues page). Ignored when `target` is set. */
  restrictToKind?: IssueTargetKind
}

export function ReportIssueModal({ open, onClose, target, restrictToKind }: ReportIssueModalProps) {
  const { user } = useAuthStore()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()
  const createIssue = useCreateIssue()

  const defaults: FormValues = {
    title: '',
    description: '',
    severity: 'major',
    targetKind: target?.kind ?? restrictToKind ?? 'vehicle',
    targetId: target?.id ?? '',
  }

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id, target?.kind])

  const targetKind = watch('targetKind')

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast.error('You must be signed in to report an issue')
      return
    }
    try {
      await createIssue.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        severity: data.severity as IssueSeverity,
        source: 'manual',
        target: { kind: data.targetKind, id: data.targetId },
        reportedByUserId: user.id,
      })
      toast.success('Issue reported')
      onClose()
      reset(defaults)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to report issue')
    }
  }

  const showTargetPicker = !target

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report Issue"
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isSubmitting ? 'Reporting...' : 'Report Issue'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {showTargetPicker && (
          <>
            {!restrictToKind && (
              <Select
                label="What is this against? *"
                {...register('targetKind')}
                onChange={(e) => {
                  setValue('targetKind', e.target.value as IssueTargetKind)
                  setValue('targetId', '')
                }}
                options={[
                  { value: 'vehicle', label: 'Vehicle' },
                  { value: 'asset', label: 'Asset' },
                ]}
              />
            )}
            <Controller
              name="targetId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label={targetKind === 'vehicle' ? 'Vehicle *' : 'Asset *'}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.targetId?.message}
                  placeholder={targetKind === 'vehicle' ? 'Select vehicle' : 'Select asset'}
                  searchPlaceholder={targetKind === 'vehicle' ? 'Search by plate or model…' : 'Search by code or name…'}
                  options={
                    targetKind === 'vehicle'
                      ? vehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))
                      : assets.map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.name}` }))
                  }
                />
              )}
            />
          </>
        )}
        <Input
          label="Title *"
          {...register('title')}
          error={errors.title?.message}
          placeholder="e.g. Brake pedal soft, pulls right"
        />
        <Textarea
          label="Description"
          {...register('description')}
          rows={3}
          placeholder="Symptoms, when it happens, anything else useful for the technician"
        />
        <Select
          label="Severity *"
          {...register('severity')}
          options={[
            { value: 'minor', label: 'Minor — cosmetic or low-impact' },
            { value: 'major', label: 'Major — affects operation or safety' },
            { value: 'critical', label: 'Critical — unsafe to operate' },
          ]}
        />
      </form>
    </Modal>
  )
}
