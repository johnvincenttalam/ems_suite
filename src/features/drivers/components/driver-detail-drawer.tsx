import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Phone,
  Mail,
  IdCard,
  Building2,
  Truck,
  Route as RouteIcon,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  CircleUserRound,
  Calendar,
} from 'lucide-react'
import { format, formatDistanceStrict, parseISO, differenceInCalendarDays } from 'date-fns'
import type { Driver } from '@/features/drivers/types'
import { useTrips, useFuelLogs, useVehicles } from '@/features/fleet'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import { Avatar } from '@/shared/ui/avatar'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Tabs } from '@/shared/ui/tabs'
import { EmptyState } from '@/shared/ui/empty-state'
import { formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

type DrawerTab = 'overview' | 'trips' | 'fuel'

interface DriverDetailDrawerProps {
  open: boolean
  driver: Driver | null
  onClose: () => void
}

export function DriverDetailDrawer({ open, driver, onClose }: DriverDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('overview')

  useEffect(() => {
    if (open) setTab('overview')
  }, [open, driver?.id])

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
    { label: 'Trips', value: 'trips' },
    { label: 'Fuel Logs', value: 'fuel' },
  ]

  return (
    <AnimatePresence>
      {open && driver && (
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
            <DrawerHeader driver={driver} onClose={onClose} />

            <div className="px-6 pt-3 border-b border-zinc-100">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'overview' && <OverviewTab driver={driver} />}
              {tab === 'trips' && <TripsTab driver={driver} />}
              {tab === 'fuel' && <FuelTab driver={driver} />}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function DrawerHeader({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
      <div className="flex items-start gap-4 min-w-0">
        <Avatar name={driver.name} size="xl" imageUrl={driver.photoUrl} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[18px] font-semibold text-zinc-900 truncate">{driver.name}</h2>
            <StatusBadge status={driver.status} />
          </div>
          <p className="text-[12px] text-zinc-500 mt-1 font-mono">{driver.id}</p>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            <span className="font-mono">{driver.licenseNumber}</span>
            <span className="text-zinc-300"> · </span>
            {driver.licenseClass}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 -mt-1 -mr-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function OverviewTab({ driver }: { driver: Driver }) {
  const { data: vehicles = [] } = useVehicles()
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()

  const assignedVehicle = vehicles.find((v) => v.assignedDriverId === driver.id)
  const department = departments.find((d) => d.id === driver.departmentId)
  const linkedUser = driver.userId ? users.find((u) => u.id === driver.userId) : null

  const today = new Date()
  const expiryDays = differenceInCalendarDays(parseISO(driver.licenseExpiry), today)
  const expired = expiryDays < 0
  const expiringSoon = !expired && expiryDays <= 60

  return (
    <div className="space-y-5">
      <Section title="License">
        <Field label="License Number" value={<span className="font-mono">{driver.licenseNumber}</span>} icon={IdCard} />
        <Field label="Class" value={driver.licenseClass} icon={CheckCircle2} />
        <Field
          label="Expiry"
          value={
            <div className="leading-tight">
              <p className={cn(expired ? 'text-red-600 font-medium' : 'text-zinc-700')}>
                {format(parseISO(driver.licenseExpiry), 'MMMM d, yyyy')}
              </p>
              {(expired || expiringSoon) && (
                <p
                  className={cn(
                    'text-[11.5px] inline-flex items-center gap-1 mt-0.5',
                    expired ? 'text-red-600' : 'text-amber-600',
                  )}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {expired ? `expired ${Math.abs(expiryDays)}d ago` : `expires in ${expiryDays}d`}
                </p>
              )}
            </div>
          }
          icon={Calendar}
        />
      </Section>

      <Section title="Contact">
        <Field label="Phone" value={driver.phone ?? '—'} icon={Phone} />
        <Field label="Email" value={driver.email ?? '—'} icon={Mail} />
      </Section>

      <Section title="Assignment">
        <Field
          label="Currently Assigned Vehicle"
          value={
            assignedVehicle ? (
              <span className="inline-flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-mono text-zinc-700">{assignedVehicle.plateNumber}</span>
                <span className="text-zinc-400">— {assignedVehicle.model}</span>
              </span>
            ) : (
              <span className="text-zinc-400">No vehicle assigned</span>
            )
          }
          icon={Truck}
        />
        <Field
          label="Department"
          value={department?.name ?? <span className="text-zinc-400">—</span>}
          icon={Building2}
        />
        <Field label="Employee ID" value={driver.employeeId ?? '—'} icon={IdCard} />
        <Field
          label="System Login"
          value={
            linkedUser ? (
              <span className="text-zinc-700">
                {linkedUser.email}
                <span className="text-zinc-400"> · {linkedUser.position ?? 'no position'}</span>
              </span>
            ) : (
              <span className="text-zinc-400">No system login</span>
            )
          }
          icon={CircleUserRound}
        />
      </Section>

      {driver.notes && (
        <Section title="Notes">
          <p className="text-[13px] text-zinc-700 whitespace-pre-wrap">{driver.notes}</p>
        </Section>
      )}

      <p className="text-[11px] text-zinc-400">
        Driver added {format(parseISO(driver.createdAt), 'MMM d, yyyy')}
      </p>
    </div>
  )
}

function TripsTab({ driver }: { driver: Driver }) {
  const { data: trips = [] } = useTrips()
  const { data: vehicles = [] } = useVehicles()

  const my = useMemo(
    () =>
      trips
        .filter((t) => t.driverId === driver.id)
        .sort((a, b) => b.startTime.localeCompare(a.startTime)),
    [trips, driver.id],
  )

  if (my.length === 0) {
    return (
      <EmptyState
        icon={RouteIcon}
        title="No trips logged"
        description={`${driver.name} hasn't been recorded on any trips yet.`}
      />
    )
  }

  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]))
  const totalKm = my.filter((t) => t.status === 'completed').reduce((s, t) => s + t.distance, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-[12px] text-zinc-500">
        <span>
          <strong className="text-zinc-700 tabular-nums">{my.length}</strong> trip{my.length === 1 ? '' : 's'} total
        </span>
        <span>
          <strong className="text-zinc-700 tabular-nums">{totalKm.toLocaleString()}</strong> km completed
        </span>
      </div>
      <ul className="space-y-2">
        {my.slice(0, 20).map((t) => {
          const v = vehicleMap[t.vehicleId]
          const status =
            t.status === 'in_progress' ? 'Running' : t.status === 'cancelled' ? 'Cancelled' : 'Completed'
          const statusStyle =
            t.status === 'in_progress'
              ? 'bg-blue-50 text-blue-700'
              : t.status === 'cancelled'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-emerald-50 text-emerald-700'
          const dur =
            t.status === 'completed' && t.endTime
              ? formatDistanceStrict(parseISO(t.endTime), parseISO(t.startTime))
              : null
          return (
            <li
              key={t.id}
              className="bg-white rounded-lg border border-zinc-200/60 px-4 py-3 flex items-start gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-zinc-400">{t.id}</span>
                  <span className={cn('px-1.5 py-0.5 rounded text-[10.5px] font-medium uppercase', statusStyle)}>
                    {status}
                  </span>
                </div>
                <p className="text-[13px] text-zinc-700 mt-1">{t.purpose ?? '—'}</p>
                <p className="text-[11.5px] text-zinc-500 mt-1">
                  {v ? (
                    <>
                      <span className="font-mono">{v.plateNumber}</span> · {v.model}
                    </>
                  ) : (
                    t.vehicleId
                  )}
                  <span className="text-zinc-300"> · </span>
                  {format(parseISO(t.startTime), 'MMM d, HH:mm')}
                  {dur && <> · {dur}</>}
                </p>
              </div>
              {t.status === 'completed' && (
                <span className="text-[12px] text-zinc-700 tabular-nums whitespace-nowrap">
                  {t.distance.toLocaleString()} km
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FuelTab({ driver }: { driver: Driver }) {
  const { data: fuelLogs = [] } = useFuelLogs()
  const { data: vehicles = [] } = useVehicles()

  const my = useMemo(
    () =>
      fuelLogs
        .filter((f) => f.driverId === driver.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [fuelLogs, driver.id],
  )

  if (my.length === 0) {
    return (
      <EmptyState
        icon={Fuel}
        title="No fuel logs"
        description={`${driver.name} hasn't logged any fuel transactions yet.`}
      />
    )
  }

  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]))
  const totalCost = my.reduce((s, f) => s + f.totalCost, 0)
  const totalLiters = my.reduce((s, f) => s + f.liters, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-[12px] text-zinc-500">
        <span>
          <strong className="text-zinc-700 tabular-nums">{my.length}</strong> log{my.length === 1 ? '' : 's'}
        </span>
        <span>
          <strong className="text-zinc-700 tabular-nums">{totalLiters.toFixed(1)}</strong> L
        </span>
        <span>
          <strong className="text-zinc-700 tabular-nums">{formatCurrency(totalCost)}</strong> total
        </span>
      </div>
      <ul className="space-y-2">
        {my.slice(0, 20).map((f) => {
          const v = vehicleMap[f.vehicleId]
          return (
            <li
              key={f.id}
              className="bg-white rounded-lg border border-zinc-200/60 px-4 py-3 flex items-start gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-zinc-400">{f.id}</span>
                  <span className="text-[11px] text-zinc-500">
                    {format(parseISO(f.date), 'MMM d, yyyy')}
                  </span>
                </div>
                <p className="text-[12.5px] text-zinc-700 mt-1">
                  {v ? (
                    <>
                      <span className="font-mono">{v.plateNumber}</span> · {v.model}
                    </>
                  ) : (
                    f.vehicleId
                  )}
                </p>
                <p className="text-[11.5px] text-zinc-500 mt-0.5">
                  {f.liters} L @ {formatCurrency(f.costPerLiter)}/L · {f.station ?? 'station n/a'}
                </p>
              </div>
              <span className="text-[12px] text-zinc-900 font-medium tabular-nums whitespace-nowrap">
                {formatCurrency(f.totalCost)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
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
