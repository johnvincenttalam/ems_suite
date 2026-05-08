import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Package,
  History as HistoryIcon,
  ClipboardCheck,
  UserCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeftRight,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useUsers } from '@/features/users'
import { useCategories } from '@/features/categories'
import { useWarehouses } from '@/features/warehouses'
import { useAuthStore } from '@/features/auth'
import { useWorkOrders } from '@/features/maintenance'
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '@/features/maintenance'
import {
  assetsApi,
  useAssetEvents,
  useAssetInspections,
  useAssetAssignments,
  depreciationSummary,
} from '@/features/assets'
import type {
  Asset,
  AssetEventType,
  Inspection,
  InspectionLine,
} from '@/features/assets/types'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { ConditionPill } from '@/features/assets/components/condition-pill'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

type DrawerTab = 'overview' | 'assignments' | 'maintenance' | 'inspections' | 'history'

interface AssetDetailDrawerProps {
  open: boolean
  asset: Asset | null
  onClose: () => void
}

export function AssetDetailDrawer({ open, asset, onClose }: AssetDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('overview')

  useEffect(() => {
    if (open) setTab('overview')
  }, [open, asset?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const tabs: { label: string; value: DrawerTab }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Assignments', value: 'assignments' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Inspections', value: 'inspections' },
    { label: 'History', value: 'history' },
  ]

  return (
    <AnimatePresence>
      {open && asset && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] as const }}
            className="absolute top-0 right-0 h-full w-full sm:w-[640px] bg-white shadow-xl border-l border-zinc-200 flex flex-col"
          >
            <DrawerHeader asset={asset} onClose={onClose} />

            <div className="px-6 pt-3 border-b border-zinc-100">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'overview' && <OverviewTab asset={asset} />}
              {tab === 'assignments' && <AssignmentsTab asset={asset} />}
              {tab === 'maintenance' && <MaintenanceTab asset={asset} />}
              {tab === 'inspections' && <InspectionsTab asset={asset} />}
              {tab === 'history' && <HistoryTab asset={asset} />}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function DrawerHeader({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { data: categories = [] } = useCategories()
  const category = categories.find((c) => c.id === asset.categoryId)
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-14 h-14 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {asset.imageUrl ? (
            <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-zinc-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[11px] text-zinc-400">{asset.assetCode}</span>
            <StatusBadge status={asset.status} size="sm" />
            <ConditionPill condition={asset.condition} />
          </div>
          <h2 className="text-base font-semibold text-zinc-900 truncate">{asset.name}</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
            {category?.name ?? '—'}{asset.model ? ` · ${asset.model}` : ''}{asset.vendor ? ` · ${asset.vendor}` : ''}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors flex-shrink-0"
        aria-label="Close drawer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function OverviewTab({ asset }: { asset: Asset }) {
  const { data: warehouses = [] } = useWarehouses()
  const { data: users = [] } = useUsers()
  const location = warehouses.find((w) => w.id === asset.locationId)
  const assignee = asset.assignedTo ? users.find((u) => u.id === asset.assignedTo) : null

  return (
    <div className="space-y-6">
      <Section title="Identification">
        <Grid>
          <Field label="Asset Code">{asset.assetCode}</Field>
          <Field label="Serial Number" mono>{asset.serialNumber}</Field>
          {asset.model && <Field label="Model">{asset.model}</Field>}
          {asset.vendor && <Field label="Vendor">{asset.vendor}</Field>}
        </Grid>
      </Section>

      <Section title="Location & Assignment">
        <Grid>
          <Field label="Location">{location?.name ?? asset.locationId}</Field>
          <Field label="Assigned To">{assignee?.name ?? <span className="text-zinc-400">Unassigned</span>}</Field>
        </Grid>
      </Section>

      <Section title="Lifecycle & Cost">
        <Grid>
          <Field label="Purchase Date">{format(parseISO(asset.purchaseDate), 'MMM d, yyyy')}</Field>
          {asset.purchaseCost !== undefined && (
            <Field label="Purchase Cost">{formatCurrency(asset.purchaseCost)}</Field>
          )}
          {asset.warrantyExpiry && (
            <Field label="Warranty Expiry">{format(parseISO(asset.warrantyExpiry), 'MMM d, yyyy')}</Field>
          )}
          {asset.usefulLifeMonths && (
            <Field label="Useful Life">{asset.usefulLifeMonths} months</Field>
          )}
          {asset.salvageValue !== undefined && (
            <Field label="Salvage Value">{formatCurrency(asset.salvageValue)}</Field>
          )}
        </Grid>
      </Section>

      <DepreciationSection asset={asset} />

      {asset.disposal && (
        <Section title="Disposal">
          <Grid>
            <Field label="Type">{asset.disposal.type}</Field>
            <Field label="Date">{format(parseISO(asset.disposal.disposedDate), 'MMM d, yyyy')}</Field>
            {asset.disposal.amount !== undefined && (
              <Field label="Amount">{formatCurrency(asset.disposal.amount)}</Field>
            )}
            {asset.disposal.disposedTo && <Field label="Disposed To">{asset.disposal.disposedTo}</Field>}
            <Field label="Submitted By">{asset.disposal.disposedBy}</Field>
            {asset.disposal.approvedBy && <Field label="Approved By">{asset.disposal.approvedBy}</Field>}
          </Grid>
          <p className="text-[12px] text-zinc-600 italic mt-2">{asset.disposal.reason}</p>
        </Section>
      )}

      {(asset.description || asset.notes) && (
        <Section title="Notes">
          {asset.description && <p className="text-[13px] text-zinc-700 leading-relaxed">{asset.description}</p>}
          {asset.notes && <p className="text-[13px] text-zinc-500 italic mt-2">{asset.notes}</p>}
        </Section>
      )}
    </div>
  )
}

function DepreciationSection({ asset }: { asset: Asset }) {
  const summary = depreciationSummary(asset)
  if (!summary.schedulable) return null

  const life = asset.usefulLifeMonths ?? 0
  const remaining = life - summary.monthsElapsed
  const pct = life === 0 ? 0 : Math.min(100, (summary.monthsElapsed / life) * 100)

  return (
    <Section title="Depreciation (Straight-line)">
      <Grid>
        <Field label="Book Value">{formatCurrency(summary.bookValue)}</Field>
        <Field label="Depreciation to Date">{formatCurrency(summary.depreciationToDate)}</Field>
        <Field label="Monthly">{formatCurrency(summary.monthlyDepreciation)}</Field>
        <Field label="Months Elapsed">
          {summary.monthsElapsed} / {life}
          {summary.fullyDepreciated && <span className="ml-1 text-[11px] text-zinc-400">(fully depreciated)</span>}
        </Field>
      </Grid>
      <div className="mt-3">
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              summary.fullyDepreciated ? 'bg-zinc-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5">
          {summary.fullyDepreciated
            ? 'Fully depreciated — book value held at salvage.'
            : `${remaining} month${remaining === 1 ? '' : 's'} of useful life remaining`}
        </p>
      </div>
    </Section>
  )
}

function AssignmentsTab({ asset }: { asset: Asset }) {
  const { data: allAssignments = [] } = useAssetAssignments()
  const { data: users = [] } = useUsers()
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const assignments = useMemo(
    () =>
      allAssignments
        .filter((a) => a.assetId === asset.id)
        .sort((a, b) => b.assignedDate.localeCompare(a.assignedDate)),
    [allAssignments, asset.id],
  )

  if (assignments.length === 0) {
    return <EmptyState icon={UserCheck} message="No assignment history yet" />
  }

  return (
    <ul className="space-y-3">
      {assignments.map((a) => {
        const user = userMap[a.assignedTo]
        const open = !a.returnedDate
        return (
          <li key={a.id} className={cn('rounded-lg border p-4', open ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200 bg-white')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-zinc-900">{user?.name ?? a.assignedTo}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {format(parseISO(a.assignedDate), 'MMM d, yyyy')}
                  {a.returnedDate ? ` → ${format(parseISO(a.returnedDate), 'MMM d, yyyy')}` : ' → present'}
                </p>
                {a.notes && <p className="text-[12px] text-zinc-600 italic mt-1.5">{a.notes}</p>}
              </div>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10.5px] font-medium', open ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200')}>
                {open ? 'Active' : 'Returned'}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function MaintenanceTab({ asset }: { asset: Asset }) {
  const { data: workOrders = [] } = useWorkOrders()
  const { data: users = [] } = useUsers()
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const orders = useMemo(
    () =>
      workOrders
        .filter((wo) => wo.assetId === asset.id)
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    [workOrders, asset.id],
  )

  const upcoming = orders.filter((wo) => wo.status !== 'completed')
  const completed = orders.filter((wo) => wo.status === 'completed')

  if (orders.length === 0) {
    return <EmptyState icon={Wrench} message="No work orders for this asset yet" />
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
            Upcoming · {upcoming.length}
          </p>
          <ul className="space-y-2">
            {upcoming.map((wo) => (
              <WorkOrderRow key={wo.id} order={wo} userMap={userMap} />
            ))}
          </ul>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
            Completed · {completed.length}
          </p>
          <ul className="space-y-2">
            {completed.map((wo) => (
              <WorkOrderRow key={wo.id} order={wo} userMap={userMap} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function WorkOrderRow({
  order,
  userMap,
}: {
  order: WorkOrder
  userMap: Record<string, { id: string; name: string }>
}) {
  const technician = userMap[order.assignedTo]
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-zinc-400">{order.id}</span>
            <PriorityPill priority={order.priority} />
            <WorkOrderStatusPill status={order.status} />
          </div>
          <p className="text-[13px] font-medium text-zinc-900 mt-1">{order.title}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {format(parseISO(order.scheduledDate), 'MMM d, yyyy')}
            {' · '}
            {technician?.name ?? order.assignedTo}
            {order.completedDate && <> · completed {format(parseISO(order.completedDate), 'MMM d')}</>}
          </p>
          {order.description && (
            <p className="text-[12px] text-zinc-600 italic mt-1.5">{order.description}</p>
          )}
        </div>
      </div>
    </li>
  )
}

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

function PriorityPill({ priority }: { priority: WorkOrderPriority }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium', PRIORITY_STYLES[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

const WORK_ORDER_STATUS_STYLES: Record<WorkOrderStatus, string> = {
  pending: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  ongoing: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'Pending',
  ongoing: 'In Progress',
  completed: 'Completed',
}

function WorkOrderStatusPill({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium', WORK_ORDER_STATUS_STYLES[status])}>
      {WORK_ORDER_STATUS_LABELS[status]}
    </span>
  )
}

function InspectionsTab({ asset }: { asset: Asset }) {
  const { data: inspections = [] } = useAssetInspections(asset.id)
  const [showRecord, setShowRecord] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-zinc-500">{inspections.length} inspection{inspections.length === 1 ? '' : 's'} on file</p>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowRecord(true)}>
          Record Inspection
        </Button>
      </div>

      {showRecord && (
        <RecordInspectionForm asset={asset} onDone={() => setShowRecord(false)} />
      )}

      {inspections.length === 0 && !showRecord ? (
        <EmptyState icon={ClipboardCheck} message="No inspections recorded yet" />
      ) : (
        <ul className="space-y-3">
          {inspections.map((insp) => (
            <InspectionCard key={insp.id} inspection={insp} />
          ))}
        </ul>
      )}
    </div>
  )
}

function InspectionCard({ inspection }: { inspection: Inspection }) {
  const [expanded, setExpanded] = useState(false)
  const failedCount = inspection.lines.filter((l) => l.result === 'fail').length
  const passedCount = inspection.lines.filter((l) => l.result === 'pass').length

  return (
    <li className="rounded-lg border border-zinc-200 bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-zinc-400">{inspection.id}</span>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-md border text-[10.5px] font-medium',
              inspection.overallResult === 'pass'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200',
            )}>
              {inspection.overallResult === 'pass' ? 'Pass' : 'Fail'}
            </span>
            {inspection.status === 'draft' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 text-[10.5px] font-medium">
                Draft
              </span>
            )}
          </div>
          <p className="text-[13px] text-zinc-900 mt-1">
            {format(parseISO(inspection.inspectionDate), 'MMM d, yyyy')} · {inspection.inspector}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {passedCount} pass · {failedCount} fail · {inspection.lines.length} item{inspection.lines.length === 1 ? '' : 's'}
          </p>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-zinc-100 px-4 py-3 space-y-2">
          {inspection.lines.map((l, i) => (
            <div key={i} className="flex items-start gap-3 text-[12px]">
              <div className="flex-shrink-0 mt-0.5">
                {l.result === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {l.result === 'fail' && <XCircle className="w-4 h-4 text-red-600" />}
                {l.result === 'na' && <MinusCircle className="w-4 h-4 text-zinc-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-700">{l.label}</p>
                {l.remarks && <p className="text-[11px] text-zinc-500 italic mt-0.5">{l.remarks}</p>}
              </div>
            </div>
          ))}
          {inspection.notes && (
            <p className="text-[12px] text-zinc-500 italic mt-3 pt-3 border-t border-zinc-100">
              {inspection.notes}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

const inspectionSchema = z.object({
  inspectionDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        label: z.string().min(1, 'Label required'),
        result: z.enum(['pass', 'fail', 'na'] as const),
        remarks: z.string().optional(),
      }),
    )
    .min(1, 'Add at least one checklist item'),
})

type InspectionFormValues = z.infer<typeof inspectionSchema>

function RecordInspectionForm({ asset, onDone }: { asset: Asset; onDone: () => void }) {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { register, control, handleSubmit, formState: { errors } } = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      inspectionDate: format(new Date(), 'yyyy-MM-dd'),
      lines: [
        { label: 'Visual Inspection', result: 'pass', remarks: '' },
        { label: 'Functional Test', result: 'pass', remarks: '' },
        { label: 'Safety Devices', result: 'pass', remarks: '' },
      ],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const submitMutation = useMutation({
    mutationFn: (data: InspectionFormValues & { submit: boolean }) => {
      if (!currentUser) throw new Error('Not signed in')
      return assetsApi.recordInspection({
        assetId: asset.id,
        inspectionDate: data.inspectionDate,
        inspector: currentUser.name,
        checklistId: asset.checklistId,
        lines: data.lines as InspectionLine[],
        notes: data.notes,
        submit: data.submit,
      })
    },
    onSuccess: (insp) => {
      toast.success(insp.status === 'submitted' ? `Inspection submitted — ${insp.overallResult}` : 'Inspection saved as draft')
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      onDone()
    },
    onError: (err) => toast.error('Save failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  return (
    <form className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-4 space-y-3">
      <Input
        label="Inspection Date *"
        type="date"
        {...register('inspectionDate')}
        error={errors.inspectionDate?.message}
      />

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Checklist Items</p>
        {fields.map((f, i) => (
          <div key={f.id} className="rounded-md border border-zinc-200 bg-white p-2 space-y-2">
            <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
              <Input placeholder="Item label (e.g. Engine Condition)" {...register(`lines.${i}.label`)} />
              <ResultSelect index={i} register={register} />
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Remove line"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input placeholder="Remarks (optional)" {...register(`lines.${i}.remarks`)} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ label: '', result: 'pass', remarks: '' })}
          className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add item
        </button>
      </div>

      <Textarea label="Inspector Notes" rows={2} {...register('notes')} />

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={submitMutation.isPending}>Cancel</Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={submitMutation.isPending}
          onClick={handleSubmit((d) => submitMutation.mutate({ ...d, submit: false }))}
        >
          Save Draft
        </Button>
        <Button
          type="button"
          size="sm"
          loading={submitMutation.isPending}
          onClick={handleSubmit((d) => submitMutation.mutate({ ...d, submit: true }))}
        >
          Submit Inspection
        </Button>
      </div>
    </form>
  )
}

function ResultSelect({ index, register }: { index: number; register: ReturnType<typeof useForm<InspectionFormValues>>['register'] }) {
  return (
    <select
      {...register(`lines.${index}.result`)}
      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
    >
      <option value="pass">Pass</option>
      <option value="fail">Fail</option>
      <option value="na">N/A</option>
    </select>
  )
}

function HistoryTab({ asset }: { asset: Asset }) {
  const { data: events = [] } = useAssetEvents(asset.id)
  if (events.length === 0) return <EmptyState icon={HistoryIcon} message="No history yet" />
  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3">
          <EventIcon type={e.type} />
          <div className="min-w-0 flex-1 pb-3 border-b border-zinc-100/60 last:border-0">
            <p className="text-[13px] text-zinc-900">{e.detail}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {format(parseISO(e.timestamp), 'MMM d, yyyy · HH:mm')} · {e.actorName}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EventIcon({ type }: { type: AssetEventType }) {
  const map: Partial<Record<AssetEventType, { icon: typeof Package; bg: string; color: string }>> = {
    created: { icon: Plus, bg: 'bg-zinc-100', color: 'text-zinc-700' },
    assigned: { icon: UserCheck, bg: 'bg-emerald-50', color: 'text-emerald-700' },
    returned: { icon: UserCheck, bg: 'bg-amber-50', color: 'text-amber-700' },
    transferred: { icon: ArrowLeftRight, bg: 'bg-blue-50', color: 'text-blue-700' },
    condition_changed: { icon: AlertTriangle, bg: 'bg-orange-50', color: 'text-orange-700' },
    inspection: { icon: ClipboardCheck, bg: 'bg-violet-50', color: 'text-violet-700' },
    maintenance_started: { icon: Wrench, bg: 'bg-amber-50', color: 'text-amber-700' },
    maintenance_ended: { icon: Wrench, bg: 'bg-emerald-50', color: 'text-emerald-700' },
    disposal_submitted: { icon: AlertTriangle, bg: 'bg-orange-50', color: 'text-orange-700' },
    disposal_approved: { icon: CheckCircle2, bg: 'bg-red-50', color: 'text-red-700' },
    disposal_rejected: { icon: XCircle, bg: 'bg-zinc-100', color: 'text-zinc-700' },
  }
  const meta = map[type] ?? { icon: HistoryIcon, bg: 'bg-zinc-100', color: 'text-zinc-700' }
  const Icon = meta.icon
  return (
    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', meta.bg)}>
      <Icon className={cn('w-3.5 h-3.5', meta.color)} />
    </div>
  )
}

// --- Layout primitives ----------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{title}</p>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-medium mb-0.5">{label}</p>
      <p className={cn('text-[13px] text-zinc-700', mono && 'font-mono text-[12px]')}>{children}</p>
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: typeof Package; message: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
      <p className="text-[13px] text-zinc-500">{message}</p>
    </div>
  )
}
