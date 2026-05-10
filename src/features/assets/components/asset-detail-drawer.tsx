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
  AlertCircle,
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
import { useWorkOrders, maintenanceApi } from '@/features/maintenance'
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '@/features/maintenance'
import {
  assetsApi,
  useAssetEvents,
  useAssetInspections,
  useAssetAssignments,
  depreciationSummary,
  DISPOSAL_TYPE_LABELS,
  AssetThumbnail,
} from '@/features/assets'
import {
  useIssuesForTarget,
  IssueList,
  IssueDetailDrawer,
  ReportIssueModal,
} from '@/features/issues'
import type { Issue } from '@/features/issues'
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
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import { ConditionPill } from '@/features/assets/components/condition-pill'
import { TrackingPanel } from '@/shared/tracking'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

type DrawerTab = 'overview' | 'assignments' | 'maintenance' | 'inspections' | 'issues' | 'tracking' | 'history'

interface AssetDetailDrawerProps {
  open: boolean
  asset: Asset | null
  onClose: () => void
  /** Tab to land on when opening. Defaults to 'overview'. */
  initialTab?: DrawerTab
}

export function AssetDetailDrawer({ open, asset, onClose, initialTab = 'overview' }: AssetDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>(initialTab)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, asset?.id, initialTab])

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
    { label: 'Issues', value: 'issues' },
    { label: 'Tracking', value: 'tracking' },
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
              {tab === 'issues' && <IssuesTab asset={asset} />}
              {tab === 'tracking' && <TrackingPanel entityType="asset" entityId={asset.id} />}
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
        <AssetThumbnail imageUrl={asset.imageUrl} alt={asset.name} size="lg" />
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
            <Field label="Type">{DISPOSAL_TYPE_LABELS[asset.disposal.type]}</Field>
            <Field label="Date">{format(parseISO(asset.disposal.disposedDate), 'MMM d, yyyy')}</Field>
            {asset.disposal.amount !== undefined && (
              <Field label="Amount">{formatCurrency(asset.disposal.amount)}</Field>
            )}
            {asset.disposal.disposedTo && <Field label="Disposed To">{asset.disposal.disposedTo}</Field>}
            <Field label="Submitted By">{asset.disposal.disposedBy}</Field>
            {asset.disposal.pendingApproverName && !asset.disposal.approvedBy && (
              <Field label="Awaits">{asset.disposal.pendingApproverName}</Field>
            )}
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
  const [showSchedule, setShowSchedule] = useState(false)

  const orders = useMemo(
    () =>
      workOrders
        .filter((wo) => wo.assetId === asset.id)
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    [workOrders, asset.id],
  )

  const upcoming = orders.filter((wo) => wo.status === 'pending' || wo.status === 'ongoing')
  const closed = orders.filter((wo) => wo.status === 'completed' || wo.status === 'cancelled')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-zinc-500">
          {orders.length} work order{orders.length === 1 ? '' : 's'} on file
        </p>
        <Button
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowSchedule(true)}
          disabled={asset.status === 'disposed'}
        >
          Schedule Maintenance
        </Button>
      </div>

      {showSchedule && (
        <ScheduleMaintenanceForm asset={asset} users={users} onDone={() => setShowSchedule(false)} />
      )}

      {orders.length === 0 && !showSchedule ? (
        <EmptyState icon={Wrench} message="No work orders for this asset yet" />
      ) : (
        <>
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
          {closed.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                History · {closed.length}
              </p>
              <ul className="space-y-2">
                {closed.map((wo) => (
                  <WorkOrderRow key={wo.id} order={wo} userMap={userMap} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const scheduleMaintenanceSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  assignedTo: z.string().min(1, 'Technician is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical'] as const),
  scheduledDate: z.string().min(1, 'Schedule date is required'),
})

type ScheduleMaintenanceFormValues = z.infer<typeof scheduleMaintenanceSchema>

function ScheduleMaintenanceForm({
  asset,
  users,
  onDone,
}: {
  asset: Asset
  users: { id: string; name: string; status: string }[]
  onDone: () => void
}) {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<ScheduleMaintenanceFormValues>({
    resolver: zodResolver(scheduleMaintenanceSchema),
    defaultValues: {
      priority: 'medium',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: ScheduleMaintenanceFormValues) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.create({
        title: data.title,
        description: data.description,
        assetId: asset.id,
        assignedTo: data.assignedTo,
        priority: data.priority,
        scheduledDate: data.scheduledDate,
        createdBy: currentUser.id,
      })
    },
    onSuccess: (wo) => {
      toast.success(`Created ${wo.id}`, { description: `Pending — assign Start in the Maintenance module to begin work.` })
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      onDone()
    },
    onError: (err) => toast.error('Schedule failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const techOptions = users
    .filter((u) => u.status === 'active')
    .map((u) => ({ value: u.id, label: u.name }))

  return (
    <form
      onSubmit={handleSubmit((d) => createMutation.mutate(d))}
      className="rounded-lg border border-zinc-200 bg-zinc-50/30 p-4 space-y-3"
    >
      <Input label="Title *" placeholder="e.g. Quarterly inspection" {...register('title')} error={errors.title?.message} />
      <Textarea label="Description" rows={2} {...register('description')} />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Technician *"
          {...register('assignedTo')}
          error={errors.assignedTo?.message}
          placeholder="Select technician"
          options={techOptions}
        />
        <Input
          label="Scheduled Date *"
          type="date"
          {...register('scheduledDate')}
          error={errors.scheduledDate?.message}
        />
      </div>
      <Select
        label="Priority *"
        {...register('priority')}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'critical', label: 'Critical' },
        ]}
      />
      <p className="text-[11px] text-zinc-500">
        The work order is created in the Maintenance module as <span className="font-medium">Pending</span>.
        It moves to <span className="font-medium">In Progress</span> when started; the asset flips to maintenance status then.
      </p>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={createMutation.isPending}>Cancel</Button>
        <Button type="submit" size="sm" loading={createMutation.isPending}>Create Work Order</Button>
      </div>
    </form>
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
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'Pending',
  ongoing: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
      if (insp.status === 'draft') {
        toast.message('Inspection saved as draft')
      } else if (insp.overallResult === 'fail') {
        toast.warning('Inspection submitted — failed', {
          description: 'One or more checklist items failed; consider scheduling maintenance.',
        })
      } else {
        toast.success('Inspection submitted — passed')
      }
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
          onClick={() => append({ label: `Checklist Item ${fields.length + 1}`, result: 'pass', remarks: '' })}
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

function IssuesTab({ asset }: { asset: Asset }) {
  const { data: issues = [] } = useIssuesForTarget({ kind: 'asset', id: asset.id })
  const [selected, setSelected] = useState<Issue | null>(null)
  const [reporting, setReporting] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-zinc-500">
          Reported issues against this asset — open and historical.
        </p>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<AlertCircle className="w-3.5 h-3.5" />}
          onClick={() => setReporting(true)}
        >
          Report Issue
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200/60 overflow-hidden bg-white">
        <IssueList
          issues={issues}
          onSelect={setSelected}
          hideTarget
          emptyTitle="No issues reported"
          emptyDescription="Nothing has been raised against this asset yet."
        />
      </div>

      <IssueDetailDrawer open={!!selected} issue={selected} onClose={() => setSelected(null)} />
      <ReportIssueModal
        open={reporting}
        onClose={() => setReporting(false)}
        target={{ kind: 'asset', id: asset.id }}
      />
    </div>
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
    disposal_approved: { icon: CheckCircle2, bg: 'bg-zinc-100', color: 'text-zinc-700' },
    disposal_rejected: { icon: XCircle, bg: 'bg-blue-50', color: 'text-blue-700' },
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
