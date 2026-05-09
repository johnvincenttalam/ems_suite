import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { format, formatDistanceStrict, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  X,
  Edit2,
  PowerOff,
  MapPin,
  ClipboardList,
  ExternalLink,
  Truck,
  Wrench,
  Route as RouteIcon,
  Fuel,
  AlertCircle,
  History as HistoryIcon,
  Inbox,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth'
import { useUsers } from '@/features/users'
import { useAssets } from '@/features/assets'
import { useTemplates } from '@/features/checklists'
import { useAuditLog } from '@/features/audit-log'
import { useTrips, useFuelLogs, useRetireVehicle } from '@/features/fleet'
import { useWorkOrders } from '@/features/maintenance'
import { useIssuesForTarget, IssueList, IssueDetailDrawer, ReportIssueModal } from '@/features/issues'
import type { Issue } from '@/features/issues'
import type { Vehicle } from '@/features/fleet/types'
import type { WorkOrder } from '@/features/maintenance/types'
import { ChecklistPanel } from '@/shared/checklists'
import { TrackingPanel } from '@/shared/tracking'
import { Tabs } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Avatar } from '@/shared/ui/avatar'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

type DrawerTab = 'overview' | 'issues' | 'maintenance' | 'trips' | 'fuel' | 'history'

interface VehicleDetailDrawerProps {
  open: boolean
  vehicle: Vehicle | null
  onClose: () => void
  onEdit: (vehicle: Vehicle) => void
}

export function VehicleDetailDrawer({ open, vehicle, onClose, onEdit }: VehicleDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('overview')
  const [retiring, setRetiring] = useState(false)
  const [retireReason, setRetireReason] = useState('')
  const { user } = useAuthStore()
  const retireMutation = useRetireVehicle()

  useEffect(() => {
    if (open) {
      setTab('overview')
      setRetiring(false)
      setRetireReason('')
    }
  }, [open, vehicle?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const onRetire = async () => {
    if (!user || !vehicle) return
    try {
      await retireMutation.mutateAsync({
        id: vehicle.id,
        byUserId: user.id,
        reason: retireReason.trim() || undefined,
      })
      toast.success(`${vehicle.plateNumber} retired`)
      setRetiring(false)
      setRetireReason('')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Retire failed')
    }
  }

  const tabs: { label: string; value: DrawerTab; count?: number }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Issues', value: 'issues' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Trips', value: 'trips' },
    { label: 'Fuel', value: 'fuel' },
    { label: 'History', value: 'history' },
  ]

  return (
    <AnimatePresence>
      {open && vehicle && (
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
            className="absolute top-0 right-0 h-full w-full sm:w-[680px] bg-white shadow-xl border-l border-zinc-200 flex flex-col"
          >
            <DrawerHeader
              vehicle={vehicle}
              onClose={onClose}
              onEdit={() => onEdit(vehicle)}
              onRetire={() => setRetiring(true)}
            />

            <div className="px-6 pt-3 border-b border-zinc-100">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'overview' && <OverviewTab vehicle={vehicle} />}
              {tab === 'issues' && <IssuesTab vehicle={vehicle} />}
              {tab === 'maintenance' && <MaintenanceTab vehicle={vehicle} />}
              {tab === 'trips' && <TripsTab vehicle={vehicle} />}
              {tab === 'fuel' && <FuelTab vehicle={vehicle} />}
              {tab === 'history' && <HistoryTab vehicle={vehicle} />}
            </div>
          </motion.aside>

          <Modal
            open={retiring}
            onClose={() => setRetiring(false)}
            title={`Retire ${vehicle.plateNumber}?`}
            size="md"
          >
            <div className="space-y-4">
              <p className="text-[13px] text-zinc-600">
                Retiring is final — the vehicle moves to <strong>retired</strong> status, the
                assigned driver is cleared, and it stops appearing in active fleet operations.
                Trips and fuel logs are preserved for the audit trail.
              </p>
              <Textarea
                label="Reason (optional)"
                rows={3}
                value={retireReason}
                onChange={(e) => setRetireReason(e.target.value)}
                placeholder="e.g. End of useful life, sold to vendor, totalled"
              />
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setRetiring(false)}
                  disabled={retireMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  fullWidth
                  loading={retireMutation.isPending}
                  onClick={onRetire}
                >
                  Confirm Retire
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </AnimatePresence>
  )
}

function DrawerHeader({
  vehicle,
  onClose,
  onEdit,
  onRetire,
}: {
  vehicle: Vehicle
  onClose: () => void
  onEdit: () => void
  onRetire: () => void
}) {
  const isRetired = vehicle.status === 'retired'
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-zinc-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[11px] text-zinc-400">{vehicle.id}</span>
            <StatusBadge status={vehicle.status} size="sm" />
          </div>
          <h2 className="text-base font-semibold text-zinc-900 leading-snug font-mono">
            {vehicle.plateNumber}
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {vehicle.model} · {vehicle.year} · {vehicle.fuelType}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isRetired && (
          <>
            <Button size="sm" variant="outline" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<PowerOff className="w-3.5 h-3.5" />} onClick={onRetire}>
              Retire
            </Button>
          </>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function OverviewTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: users = [] } = useUsers()
  const { data: assets = [] } = useAssets()
  const { data: templates = [] } = useTemplates()
  const [showLocation, setShowLocation] = useState(false)
  const [showInspection, setShowInspection] = useState(false)

  const driver = users.find((u) => u.id === vehicle.assignedDriverId)
  const linkedAsset = assets.find((a) => a.id === vehicle.linkedAssetId)
  const checklist = templates.find((t) => t.id === vehicle.checklistId)

  return (
    <div className="space-y-6">
      <Section title="Identification">
        <Grid>
          <Field label="Plate Number" mono>{vehicle.plateNumber}</Field>
          <Field label="Vehicle ID" mono>{vehicle.id}</Field>
          <Field label="Model">{vehicle.model}</Field>
          <Field label="Year">{vehicle.year}</Field>
        </Grid>
      </Section>

      <Section title="Operations">
        <Grid>
          <Field label="Status"><StatusBadge status={vehicle.status} size="sm" /></Field>
          <Field label="Fuel Type"><span className="capitalize">{vehicle.fuelType}</span></Field>
          <Field label="Odometer">
            <span className="tabular-nums">{vehicle.currentOdometer.toLocaleString()} km</span>
          </Field>
          {vehicle.fuelType !== 'electric' && (
            <Field label="Fuel Capacity">
              {vehicle.fuelCapacityLiters !== undefined ? `${vehicle.fuelCapacityLiters} L` : '—'}
            </Field>
          )}
          <Field label="Assigned Driver">
            {driver ? (
              <div className="flex items-center gap-1.5">
                <Avatar name={driver.name} size="sm" />
                <span>{driver.name}</span>
              </div>
            ) : (
              <span className="text-zinc-400">Unassigned</span>
            )}
          </Field>
          <Field label="Next Service">
            {vehicle.nextServiceDate ? format(parseISO(vehicle.nextServiceDate), 'MMM d, yyyy') : <span className="text-zinc-400">—</span>}
          </Field>
        </Grid>
      </Section>

      <Section title="Linked Records">
        <div className="space-y-2">
          {linkedAsset ? (
            <Link
              to={`/module/assets/registry?asset=${linkedAsset.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50/40 border border-zinc-200/60 hover:border-zinc-300 transition-colors"
            >
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Asset</span>
              <span className="font-mono text-[12px] text-zinc-700">{linkedAsset.assetCode}</span>
              <span className="text-[12.5px] text-zinc-700">{linkedAsset.name}</span>
              <ExternalLink className="w-3 h-3 text-zinc-400 ml-auto" />
            </Link>
          ) : (
            <div className="px-3 py-2 rounded-lg bg-amber-50/40 border border-amber-200/60 text-[12px] text-amber-800">
              Not linked to an asset — required to escalate issues to maintenance.
            </div>
          )}
          {checklist ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50/40 border border-zinc-200/60">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Checklist</span>
              <span className="text-[12.5px] text-zinc-700">{checklist.name}</span>
              <span className="text-[11px] text-zinc-400 ml-auto">{checklist.items.length} items</span>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg bg-zinc-50/40 border border-zinc-200/60 text-[12px] text-zinc-500">
              No pre-trip checklist attached.
            </div>
          )}
        </div>
      </Section>

      <Section title="Quick Actions">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<MapPin className="w-3.5 h-3.5" />}
            onClick={() => setShowLocation(true)}
          >
            View Location
          </Button>
          {vehicle.checklistId && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<ClipboardList className="w-3.5 h-3.5" />}
              onClick={() => setShowInspection(true)}
            >
              Pre-trip Inspection
            </Button>
          )}
        </div>
      </Section>

      <Modal open={showLocation} onClose={() => setShowLocation(false)} title={`Location · ${vehicle.plateNumber}`} size="lg">
        <TrackingPanel entityType="vehicle" entityId={vehicle.id} />
      </Modal>

      <Modal
        open={showInspection}
        onClose={() => setShowInspection(false)}
        title={`Pre-trip Inspection · ${vehicle.plateNumber}`}
        size="lg"
      >
        <ChecklistPanel
          templateId={vehicle.checklistId}
          assignedToUserId={vehicle.assignedDriverId}
        />
      </Modal>
    </div>
  )
}

function IssuesTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: issues = [] } = useIssuesForTarget({ kind: 'vehicle', id: vehicle.id })
  const [selected, setSelected] = useState<Issue | null>(null)
  const [reporting, setReporting] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-zinc-500">
          Reported issues against this vehicle — open and historical.
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
          emptyDescription="Nothing has been raised against this vehicle yet."
        />
      </div>
      <IssueDetailDrawer open={!!selected} issue={selected} onClose={() => setSelected(null)} />
      <ReportIssueModal
        open={reporting}
        onClose={() => setReporting(false)}
        target={{ kind: 'vehicle', id: vehicle.id }}
      />
    </div>
  )
}

function MaintenanceTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: workOrders = [] } = useWorkOrders()
  const { data: users = [] } = useUsers()

  if (!vehicle.linkedAssetId) {
    return (
      <EmptyState
        icon={Wrench}
        title="No linked asset"
        message="Maintenance work orders attach to assets. Link this vehicle to an asset record (Edit → Linked Asset) to track its service history here."
      />
    )
  }

  const linked = workOrders.filter((wo) => wo.assetId === vehicle.linkedAssetId)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))

  if (linked.length === 0) {
    return <EmptyState icon={Wrench} title="No work orders" message="No maintenance has been scheduled or recorded yet." />
  }

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  return (
    <ul className="space-y-2">
      {linked.slice(0, 20).map((wo: WorkOrder) => {
        const tech = userMap[wo.assignedTo]
        return (
          <li key={wo.id} className="rounded-lg border border-zinc-200/60 px-4 py-3 hover:border-zinc-300 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-zinc-400">{wo.id}</span>
                  <StatusBadge status={wo.status} size="sm" />
                  <PriorityChip priority={wo.priority} />
                </div>
                <p className="text-[13px] font-medium text-zinc-900 mt-1">{wo.title}</p>
                <p className="text-[11.5px] text-zinc-500 mt-0.5">
                  Scheduled {format(parseISO(wo.scheduledDate), 'MMM d, yyyy')}
                  {tech && <> · {tech.name}</>}
                  {wo.completedDate && <> · completed {format(parseISO(wo.completedDate), 'MMM d')}</>}
                </p>
              </div>
              <Link
                to={`/module/maintenance/work-orders?wo=${wo.id}`}
                className="text-[11.5px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 flex-shrink-0"
              >
                Open
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function TripsTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: trips = [] } = useTrips()
  const { data: users = [] } = useUsers()

  const my = trips
    .filter((t) => t.vehicleId === vehicle.id)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))

  if (my.length === 0) {
    return <EmptyState icon={RouteIcon} title="No trips logged" message="No trips have been recorded for this vehicle yet." />
  }

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
  const total = my.filter((t) => t.status === 'completed').reduce((s, t) => s + t.distance, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-[12px] text-zinc-500">
        <span><strong className="text-zinc-700 tabular-nums">{my.length}</strong> trip{my.length === 1 ? '' : 's'} total</span>
        <span><strong className="text-zinc-700 tabular-nums">{total.toLocaleString()}</strong> km completed</span>
      </div>
      <ul className="space-y-2">
        {my.slice(0, 20).map((t) => {
          const driver = userMap[t.driverId]
          const status = t.status === 'in_progress' ? 'Running' : t.status === 'cancelled' ? 'Cancelled' : 'Completed'
          const statusStyle =
            t.status === 'in_progress'
              ? 'bg-blue-50 text-blue-700'
              : t.status === 'cancelled'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-emerald-50 text-emerald-700'
          const duration =
            t.status === 'completed' && t.endTime
              ? formatDistanceStrict(parseISO(t.endTime), parseISO(t.startTime))
              : null
          return (
            <li
              key={t.id}
              className="rounded-lg border border-zinc-200/60 px-4 py-3 hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-zinc-400">{t.id}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10.5px] font-medium', statusStyle)}>
                      {status}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-zinc-700 mt-1">
                    {t.purpose ?? <span className="text-zinc-400">No purpose noted</span>}
                  </p>
                  <p className="text-[11.5px] text-zinc-500 mt-0.5">
                    {format(parseISO(t.startTime), 'MMM d, HH:mm')}
                    {driver && <> · {driver.name}</>}
                    {duration && <> · {duration}</>}
                    {t.status === 'completed' && (
                      <>
                        {' · '}
                        <span className="tabular-nums">{t.distance.toLocaleString()} km</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FuelTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: fuelLogs = [] } = useFuelLogs()

  const my = fuelLogs
    .filter((f) => f.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (my.length === 0) {
    return <EmptyState icon={Fuel} title="No fuel logs" message="No fuel entries have been logged for this vehicle yet." />
  }

  const totalLiters = my.reduce((s, f) => s + f.liters, 0)
  const totalCost = my.reduce((s, f) => s + f.totalCost, 0)
  const avgPerLiter = totalLiters === 0 ? 0 : totalCost / totalLiters

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-[12px] text-zinc-500 flex-wrap">
        <span><strong className="text-zinc-700 tabular-nums">{totalLiters.toFixed(1)} L</strong> total</span>
        <span><strong className="text-zinc-700 tabular-nums">{formatCompactCurrency(totalCost)}</strong> spent</span>
        <span>avg <strong className="text-zinc-700 tabular-nums">{formatCurrency(avgPerLiter)}</strong>/L</span>
      </div>
      <ul className="space-y-2">
        {my.slice(0, 20).map((f) => (
          <li key={f.id} className="rounded-lg border border-zinc-200/60 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12.5px] text-zinc-700">
                  <span className="tabular-nums">{f.liters.toFixed(1)} L</span>
                  <span className="text-zinc-400"> · </span>
                  <span className="tabular-nums">{formatCurrency(f.totalCost)}</span>
                </p>
                <p className="text-[11.5px] text-zinc-500 mt-0.5">
                  {format(parseISO(f.date), 'MMM d, yyyy')}
                  {f.station && <> · {f.station}</>}
                </p>
                {f.notes && <p className="text-[11.5px] text-zinc-400 italic mt-0.5">"{f.notes}"</p>}
              </div>
              <span className="text-[11px] text-zinc-400 tabular-nums whitespace-nowrap">
                @ {f.odometer.toLocaleString()} km
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HistoryTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: entries = [] } = useAuditLog()
  const my = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.module === 'Fleet' &&
            (e.detail.includes(vehicle.id) || e.detail.includes(vehicle.plateNumber)),
        )
        .slice(0, 50),
    [entries, vehicle.id, vehicle.plateNumber],
  )

  if (my.length === 0) {
    return <EmptyState icon={HistoryIcon} title="No history" message="No audit entries reference this vehicle yet." />
  }

  return (
    <ul className="space-y-2">
      {my.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-zinc-200/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] text-zinc-700">{entry.detail}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {entry.userName} · {format(parseISO(entry.timestamp), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <span className="text-[10.5px] uppercase tracking-wider text-zinc-400">{entry.action}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function PriorityChip({ priority }: { priority: WorkOrder['priority'] }) {
  const style: Record<WorkOrder['priority'], string> = {
    low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium capitalize',
        style[priority],
      )}
    >
      {priority}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">
        {label}
      </p>
      <div className={cn('text-[13px] text-zinc-800', mono && 'font-mono')}>{children}</div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: typeof Inbox
  title: string
  message: string
}) {
  return (
    <div className="py-12 text-center">
      <Icon className="w-7 h-7 text-zinc-300 mx-auto mb-3" />
      <p className="text-[14px] font-medium text-zinc-700">{title}</p>
      <p className="text-[12.5px] text-zinc-500 mt-1 max-w-sm mx-auto">{message}</p>
    </div>
  )
}
