import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CheckSquare,
  Ban,
  Truck,
  CircleUserRound,
  Calendar,
  MapPin,
  Fuel,
  Loader2,
  Gauge,
  History as HistoryIcon,
} from 'lucide-react'
import { format, formatDistanceStrict, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Trip } from '@/features/fleet/types'
import { useVehicles, useFuelLogs, useCompleteTrip, useCancelTrip } from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAuthStore } from '@/features/auth'
import { useAuditLog } from '@/features/audit-log'
import { Avatar } from '@/shared/ui/avatar'
import { VehicleThumbnail } from '@/features/fleet/components/vehicle-thumbnail'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { StatusBadge } from '@/shared/ui/status-badge'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

const endTripSchema = z.object({
  endOdometer: z.number().int().min(0, 'Ending odometer is required'),
})

type EndTripForm = z.infer<typeof endTripSchema>

interface TripDetailDrawerProps {
  open: boolean
  trip: Trip | null
  onClose: () => void
}

export function TripDetailDrawer({ open, trip, onClose }: TripDetailDrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && trip && (
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
            className="absolute top-0 right-0 h-full w-full sm:w-[600px] bg-white shadow-xl border-l border-zinc-200 flex flex-col"
          >
            <Body trip={trip} onClose={onClose} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function Body({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { data: vehicles = [] } = useVehicles()
  const { data: drivers = [] } = useDrivers()
  const { data: fuelLogs = [] } = useFuelLogs()
  const { data: auditEntries = [] } = useAuditLog()
  const currentUser = useAuthStore((s) => s.user)
  const completeTrip = useCompleteTrip()
  const cancelTrip = useCancelTrip()

  const vehicle = vehicles.find((v) => v.id === trip.vehicleId)
  const driver = drivers.find((d) => d.id === trip.driverId)

  const [showEnd, setShowEnd] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const endTripForm = useForm<EndTripForm>({ resolver: zodResolver(endTripSchema) })
  const watchedEndOdo = endTripForm.watch('endOdometer')
  const previewDistance =
    Number.isFinite(watchedEndOdo) && (watchedEndOdo as number) >= trip.startOdometer
      ? (watchedEndOdo as number) - trip.startOdometer
      : null

  const tripFuelLogs = useMemo(() => {
    if (!trip.endTime) return [] // open trips can't bracket fuel logs yet
    const start = parseISO(trip.startTime)
    const end = parseISO(trip.endTime)
    return fuelLogs
      .filter((f) => {
        if (f.vehicleId !== trip.vehicleId) return false
        const fd = parseISO(f.date)
        return fd >= start && fd <= end
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [fuelLogs, trip])

  const tripAuditEntries = useMemo(
    () => auditEntries.filter((e) => e.detail?.includes(trip.id)).slice(0, 20),
    [auditEntries, trip.id],
  )

  const onEndTrip = async (data: EndTripForm) => {
    if (!currentUser) return
    try {
      await completeTrip.mutateAsync({
        id: trip.id,
        endOdometer: data.endOdometer,
        completedBy: currentUser.id,
      })
      toast.success(`Trip ${trip.id} completed`)
      setShowEnd(false)
      endTripForm.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'End trip failed')
    }
  }

  const onCancelTrip = async () => {
    if (!currentUser) return
    try {
      await cancelTrip.mutateAsync({
        id: trip.id,
        byUserId: currentUser.id,
        reason: cancelReason.trim() || undefined,
      })
      toast.success(`Trip ${trip.id} cancelled`)
      setShowCancel(false)
      setCancelReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel trip failed')
    }
  }

  const duration =
    trip.endTime && trip.status === 'completed'
      ? formatDistanceStrict(parseISO(trip.endTime), parseISO(trip.startTime))
      : null

  return (
    <>
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
        <div className="flex items-start gap-4 min-w-0">
          <VehicleThumbnail size="lg" imageUrl={vehicle?.photoUrl} alt={vehicle?.model} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-zinc-400">{trip.id}</span>
              <StatusBadge status={trip.status === 'in_progress' ? 'in progress' : trip.status} size="sm" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 leading-snug font-mono mt-0.5">
              {vehicle?.plateNumber ?? trip.vehicleId}
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {vehicle?.model}
              {trip.purpose && <> · {trip.purpose}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {trip.status === 'in_progress' && (
            <>
              <Button size="sm" variant="outline" leftIcon={<CheckSquare className="w-3.5 h-3.5" />} onClick={() => setShowEnd(true)}>
                End
              </Button>
              <Button size="sm" variant="ghost" leftIcon={<Ban className="w-3.5 h-3.5" />} onClick={() => setShowCancel(true)}>
                Cancel
              </Button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1.5 -mt-1 -mr-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <Section title="Trip">
          <Field
            label="Vehicle"
            value={
              vehicle ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-zinc-700">{vehicle.plateNumber}</span>
                  <span className="text-zinc-400">— {vehicle.model}</span>
                </span>
              ) : trip.vehicleId
            }
            icon={Truck}
          />
          <Field
            label="Driver"
            value={
              driver ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={driver.name} size="sm" imageUrl={driver.photoUrl} />
                  <span className="text-zinc-700">{driver.name}</span>
                </span>
              ) : trip.driverId
            }
            icon={CircleUserRound}
          />
          {trip.purpose && <Field label="Purpose" value={trip.purpose} icon={MapPin} />}
        </Section>

        <Section title="Timing">
          <Field
            label="Started"
            value={format(parseISO(trip.startTime), 'MMM d, yyyy · HH:mm')}
            icon={Calendar}
          />
          <Field
            label="Ended"
            value={
              trip.endTime
                ? format(parseISO(trip.endTime), 'MMM d, yyyy · HH:mm')
                : trip.status === 'in_progress'
                ? <span className="inline-flex items-center gap-1.5 text-blue-700"><Loader2 className="w-3.5 h-3.5 animate-spin" />Running</span>
                : <span className="text-zinc-400">—</span>
            }
            icon={Calendar}
          />
          {duration && <Field label="Duration" value={duration} icon={Calendar} />}
        </Section>

        <Section title="Odometer">
          <Field
            label="Start"
            value={<span className="tabular-nums">{trip.startOdometer.toLocaleString()} km</span>}
            icon={Gauge}
          />
          <Field
            label="End"
            value={
              trip.endOdometer != null ? (
                <span className="tabular-nums">{trip.endOdometer.toLocaleString()} km</span>
              ) : (
                <span className="text-zinc-400">—</span>
              )
            }
            icon={Gauge}
          />
          {trip.status === 'completed' && (
            <Field
              label="Distance"
              value={<span className="tabular-nums font-medium text-zinc-900">{trip.distance.toLocaleString()} km</span>}
              icon={Gauge}
            />
          )}
        </Section>

        {tripFuelLogs.length > 0 && (
          <Section title="Fuel during this trip">
            <ul className="rounded-lg border border-zinc-200/60 overflow-hidden">
              {tripFuelLogs.map((f, i) => (
                <li
                  key={f.id}
                  className={cn(
                    'flex items-start gap-3 px-3 py-2.5',
                    i !== tripFuelLogs.length - 1 && 'border-b border-zinc-100/60',
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Fuel className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-zinc-400">{f.id}</span>
                      <span className="text-[11px] text-zinc-500">{format(parseISO(f.date), 'MMM d')}</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-500 mt-0.5">
                      {f.liters} L @ {formatCurrency(f.costPerLiter)}/L
                      {f.station && <> · {f.station}</>}
                    </p>
                  </div>
                  <span className="text-[12px] text-zinc-900 font-medium tabular-nums whitespace-nowrap">
                    {formatCurrency(f.totalCost)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {tripAuditEntries.length > 0 && (
          <Section title="History">
            <ul className="space-y-1.5">
              {tripAuditEntries.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-[12px] text-zinc-600">
                  <HistoryIcon className="w-3 h-3 text-zinc-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{e.detail}</p>
                    <p className="text-[10.5px] text-zinc-400 mt-0.5">
                      {e.userName} · {format(parseISO(e.timestamp), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <Modal
        open={showEnd}
        onClose={() => { setShowEnd(false); endTripForm.reset() }}
        title={`End Trip · ${trip.id}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={completeTrip.isPending} onClick={() => { setShowEnd(false); endTripForm.reset() }}>Cancel</Button>
            <Button type="submit" form="trip-drawer-end-form" loading={completeTrip.isPending}>End Trip</Button>
          </>
        }
      >
        <form id="trip-drawer-end-form" onSubmit={endTripForm.handleSubmit(onEndTrip)} className="space-y-4">
          <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/40 px-4 py-3 text-[12.5px] text-zinc-600">
            <p>
              Started at <strong className="text-zinc-700 tabular-nums">{trip.startOdometer.toLocaleString()} km</strong>
              {' · '}
              {format(parseISO(trip.startTime), 'MMM d, HH:mm')}
            </p>
          </div>
          <Input
            label="Ending Odometer *"
            type="number"
            {...endTripForm.register('endOdometer', { valueAsNumber: true })}
            error={endTripForm.formState.errors.endOdometer?.message}
            helperText={
              previewDistance != null
                ? `Distance: ${previewDistance.toLocaleString()} km`
                : 'Must be ≥ starting odometer'
            }
          />
        </form>
      </Modal>

      <Modal
        open={showCancel}
        onClose={() => { setShowCancel(false); setCancelReason('') }}
        title={`Cancel Trip · ${trip.id}`}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={cancelTrip.isPending} onClick={() => { setShowCancel(false); setCancelReason('') }}>Keep Trip</Button>
            <Button type="button" variant="danger" loading={cancelTrip.isPending} onClick={onCancelTrip}>Cancel Trip</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-zinc-700">
            Cancel <span className="font-mono">{trip.id}</span>? Distance will be set to 0 and the trip
            marked cancelled.
          </p>
          <Textarea
            label="Reason (optional)"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Dispatcher cancelled, driver unavailable"
          />
        </div>
      </Modal>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-7 h-7 rounded-md bg-zinc-50 border border-zinc-200/60 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-zinc-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-medium">{label}</p>
        <div className="text-[13px] text-zinc-700 mt-0.5">{value}</div>
      </div>
    </div>
  )
}
