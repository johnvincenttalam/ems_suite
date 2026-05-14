import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Truck,
  Wrench,
  Route as RouteIcon,
  Fuel,
  ArrowRight,
  Bell,
  Inbox,
  CheckCircle2,
  PowerOff,
  IdCard,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  format,
  formatDistanceToNow,
  parseISO,
  startOfMonth,
  isAfter,
  subMonths,
  differenceInCalendarDays,
} from 'date-fns'
import { useVehicles, useTrips, useFuelLogs } from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAuditLog } from '@/features/audit-log'
import { useNotifications } from '@/shared/notifications'
import { useIssues, IssueList, IssueDetailDrawer } from '@/features/issues'
import type { Issue } from '@/features/issues'
import { QualityStrip } from '@/shared/qms'
import { StatCard } from '@/shared/ui/stat-card'
import { DashboardGreeting } from '@/shared/ui/dashboard-greeting'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { Avatar } from '@/shared/ui/avatar'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import type { Vehicle, VehicleStatus, FuelType } from '@/features/fleet'
import { cn } from '@/shared/utils/cn'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const STATUS_COLORS: Record<VehicleStatus, string> = {
  active: '#10b981',
  maintenance: '#f59e0b',
  retired: '#71717a',
}

const STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  retired: 'Retired',
}

const FUEL_COLORS: Record<FuelType, string> = {
  diesel: '#0ea5e9',
  petrol: '#f59e0b',
  electric: '#10b981',
}

const FUEL_LABEL: Record<FuelType, string> = {
  diesel: 'Diesel',
  petrol: 'Petrol',
  electric: 'Electric',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

const FLEET_KINDS = new Set(['vehicle_in_maintenance', 'trip_in_progress_long'])

type Priority = 'high' | 'medium' | 'low'
const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}
const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function FleetDashboard() {
  const { data: vehicles = [], isLoading } = useVehicles()
  const { data: trips = [] } = useTrips()
  const { data: fuelLogs = [] } = useFuelLogs()
  const { data: drivers = [] } = useDrivers()
  const { data: auditEntries = [] } = useAuditLog()
  const { notifications, unreadCount } = useNotifications()
  const { data: openIssues = [] } = useIssues({ targetKind: 'vehicle', status: 'all-open' })
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const total = vehicles.length
    const active = vehicles.filter((v) => v.status === 'active').length
    const inMaintenance = vehicles.filter((v) => v.status === 'maintenance').length
    const inactive = vehicles.filter((v) => v.status === 'retired').length
    const inProgress = trips.filter((t) => t.status === 'in_progress').length
    const today = new Date()
    const monthFuelCost = fuelLogs
      .filter((f) => isAfter(parseISO(f.date), startOfMonth(today)))
      .reduce((s, f) => s + f.totalCost, 0)
    const monthDistance = trips
      .filter((t) => t.status === 'completed' && t.endTime && isAfter(parseISO(t.endTime), startOfMonth(today)))
      .reduce((s, t) => s + t.distance, 0)
    return { total, active, inMaintenance, inactive, inProgress, monthFuelCost, monthDistance }
  }, [vehicles, trips, fuelLogs])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<VehicleStatus, number>()
    for (const v of vehicles) counts.set(v.status, (counts.get(v.status) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([status, value]) => ({ status, name: STATUS_LABEL[status], value }))
      .sort((a, b) => b.value - a.value)
  }, [vehicles])

  const fuelMix = useMemo(() => {
    const counts = new Map<FuelType, number>()
    for (const v of vehicles) {
      if (v.status === 'retired') continue
      counts.set(v.fuelType, (counts.get(v.fuelType) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([type, value]) => ({ type, name: FUEL_LABEL[type], value }))
      .sort((a, b) => b.value - a.value)
  }, [vehicles])

  const tripMix = useMemo(() => {
    const today = new Date()
    const monthStart = startOfMonth(today)
    let completed = 0
    let ongoing = 0
    let cancelled = 0
    for (const t of trips) {
      const ref = parseISO(t.endTime ?? t.startTime)
      if (!isAfter(ref, monthStart)) continue
      if (t.status === 'completed') completed++
      else if (t.status === 'in_progress') ongoing++
      else if (t.status === 'cancelled') cancelled++
    }
    return [
      { key: 'completed', label: 'Completed', value: completed, color: '#10b981' },
      { key: 'ongoing', label: 'Ongoing', value: ongoing, color: '#3b82f6' },
      { key: 'cancelled', label: 'Cancelled', value: cancelled, color: '#ef4444' },
    ]
  }, [trips])

  const fuelTrend = useMemo(() => {
    const now = new Date()
    const buckets: { month: string; key: string; cost: number; liters: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i)
      buckets.push({ month: format(d, 'MMM'), key: format(d, 'yyyy-MM'), cost: 0, liters: 0 })
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]))
    for (const f of fuelLogs) {
      const k = format(parseISO(f.date), 'yyyy-MM')
      const bucket = byKey.get(k)
      if (bucket) {
        bucket.cost += f.totalCost
        bucket.liters += f.liters
      }
    }
    return buckets.map(({ month, cost, liters }) => ({ month, cost, liters }))
  }, [fuelLogs])

  const recentTrips = useMemo(
    () =>
      [...trips]
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
        .slice(0, 5),
    [trips],
  )

  const maintenanceDue = useMemo(() => {
    const today = new Date()
    return vehicles
      .filter((v) => v.nextServiceDate && v.status !== 'retired')
      .map((v) => {
        const due = parseISO(v.nextServiceDate!)
        const days = differenceInCalendarDays(due, today)
        const priority: Priority = days <= 14 ? 'high' : days <= 30 ? 'medium' : 'low'
        return { vehicle: v, dueDate: due, days, priority }
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
  }, [vehicles])

  const licenseWatch = useMemo(() => {
    const today = new Date()
    return drivers
      .map((d) => {
        const exp = parseISO(d.licenseExpiry)
        const days = differenceInCalendarDays(exp, today)
        return { driver: d, expDate: exp, days }
      })
      .filter((x) => x.days <= 90)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
  }, [drivers])

  const topFuelConsumers = useMemo(() => {
    const today = new Date()
    const monthStart = startOfMonth(today)
    const totals = new Map<string, number>()
    for (const f of fuelLogs) {
      if (!isAfter(parseISO(f.date), monthStart)) continue
      totals.set(f.vehicleId, (totals.get(f.vehicleId) ?? 0) + f.totalCost)
    }
    return Array.from(totals.entries())
      .map(([id, cost]) => ({
        id,
        cost,
        vehicle: vehicles.find((v) => v.id === id),
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
  }, [fuelLogs, vehicles])

  const recentActivity = useMemo(
    () => auditEntries.filter((e) => e.module === 'Fleet').slice(0, 5),
    [auditEntries],
  )

  const fleetAlerts = useMemo(
    () => notifications.filter((n) => FLEET_KINDS.has(n.kind)).slice(0, 5),
    [notifications],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Fleet Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Loading...</p>
        </div>
        <TableSkeleton columns={4} rows={3} />
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <DashboardGreeting
          subtitle="Vehicles, trips, fuel cost, and fleet health."
          actions={
            <>
              <Link
                to="alerts"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <Bell className="w-4 h-4" />
                Alerts
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[11px] font-medium rounded-full">{unreadCount}</span>
                )}
              </Link>
              <Link
                to="vehicles"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[13px] hover:bg-zinc-800 transition-colors"
              >
                <Truck className="w-4 h-4" />
                Open Fleet
              </Link>
            </>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Vehicles"
          value={stats.total}
          subtitle="All units"
          icon={Truck}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          index={0}
        />
        <StatCard
          title="Active"
          value={stats.active}
          subtitle={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of total` : '—'}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={1}
        />
        <StatCard
          title="In Maintenance"
          value={stats.inMaintenance}
          subtitle={stats.inMaintenance > 0 ? 'Off the road' : 'All operational'}
          icon={Wrench}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={2}
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          subtitle={stats.inactive > 0 ? 'Retired units' : 'None retired'}
          icon={PowerOff}
          iconBg="bg-zinc-100"
          iconColor="text-zinc-600"
          index={3}
        />
        <StatCard
          title="Trips Active"
          value={stats.inProgress}
          subtitle={stats.inProgress > 0 ? 'Currently running' : 'No active trips'}
          icon={RouteIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          index={4}
        />
        <StatCard
          title="Fuel Cost (MTD)"
          value={formatCompactCurrency(stats.monthFuelCost)}
          subtitle={`${stats.monthDistance.toLocaleString()} km logged`}
          icon={Fuel}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={5}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Fuel Cost Trend</CardTitle>
            <Link to="fuel-logs" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View logs
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={fuelTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Cost']} />
                  <Bar dataKey="cost" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {statusBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No vehicles</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fuel Mix</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 220 }}>
              {fuelMix.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No vehicles in service</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={fuelMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {fuelMix.map((entry) => (
                        <Cell key={entry.type} fill={FUEL_COLORS[entry.type]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} vehicles`, n]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Summary (MTD)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={tripMix} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} trips`, '']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {tripMix.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>License Expiry</CardTitle>
            <Link to="drivers" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View drivers
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {licenseWatch.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <IdCard className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No expiring licenses</p>
              </div>
            ) : (
              <ul>
                {licenseWatch.map((row, i) => {
                  const expired = row.days < 0
                  const urgent = !expired && row.days <= 30
                  return (
                    <li
                      key={row.driver.id}
                      className={cn(
                        'px-6 py-3 flex items-center justify-between gap-3',
                        i !== licenseWatch.length - 1 && 'border-b border-zinc-100/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{row.driver.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {format(row.expDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap',
                          expired
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : urgent
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200',
                        )}
                      >
                        {expired
                          ? `Expired ${Math.abs(row.days)}d ago`
                          : `${row.days}d left`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Recent Trips</CardTitle>
            <Link to="trips" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentTrips.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <RouteIcon className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No trips logged</p>
              </div>
            ) : (
              <ul>
                {recentTrips.map((t, i) => {
                  const v = vehicles.find((x) => x.id === t.vehicleId)
                  const driver = drivers.find((d) => d.id === t.driverId)
                  const badgeStyle =
                    t.status === 'in_progress'
                      ? 'bg-blue-50 text-blue-700'
                      : t.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-emerald-50 text-emerald-700'
                  const badgeLabel =
                    t.status === 'in_progress'
                      ? 'Running'
                      : t.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Completed'
                  return (
                    <li
                      key={t.id}
                      className={cn(
                        'px-6 py-3 cursor-pointer hover:bg-zinc-50/50',
                        i !== recentTrips.length - 1 && 'border-b border-zinc-100/60',
                      )}
                      onClick={() => navigate(`trips?trip=${t.id}`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-zinc-900 truncate">{v?.plateNumber ?? t.vehicleId}</p>
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                                badgeStyle,
                              )}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {driver ? (
                              <>
                                <Avatar name={driver.name} imageUrl={driver.photoUrl} size="sm" className="w-4 h-4 text-[8px]" />
                                <span className="text-[11px] text-zinc-400">{driver.name}</span>
                              </>
                            ) : (
                              <span className="text-[11px] text-zinc-400">{t.driverId}</span>
                            )}
                            <span className="text-[11px] text-zinc-400">· {t.distance.toLocaleString()} km</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                          {formatDistanceToNow(parseISO(t.startTime), { addSuffix: true })}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Maintenance Due</CardTitle>
            <Link to="maintenance" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View schedule
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {maintenanceDue.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Wrench className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No services scheduled</p>
              </div>
            ) : (
              <ul>
                {maintenanceDue.map((row: { vehicle: Vehicle; dueDate: Date; days: number; priority: Priority }, i) => (
                  <li
                    key={row.vehicle.id}
                    className={cn(
                      'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                      i !== maintenanceDue.length - 1 && 'border-b border-zinc-100/60',
                    )}
                    onClick={() => navigate(`vehicles?vehicle=${row.vehicle.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{row.vehicle.plateNumber}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {row.vehicle.model} · {format(row.dueDate, 'MMM d, yyyy')}
                        {row.days < 0 && (
                          <span className="ml-1 text-red-600 inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {Math.abs(row.days)}d overdue
                          </span>
                        )}
                        {row.days >= 0 && row.days <= 30 && (
                          <span className="ml-1 text-zinc-500">in {row.days}d</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap',
                        PRIORITY_STYLE[row.priority],
                      )}
                    >
                      {PRIORITY_LABEL[row.priority]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle className="flex items-center gap-2">
              Open Issues
              {openIssues.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-medium">
                  {openIssues.length}
                </span>
              )}
            </CardTitle>
            <Link to="issues" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <IssueList
              issues={openIssues.slice(0, 5)}
              onSelect={setSelectedIssue}
              hideTarget={false}
              emptyTitle="No open issues"
              emptyDescription="Your fleet is clean — nothing reported, nothing flagged."
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Top Fuel Consumers (MTD)</CardTitle>
            <Link to="fuel-logs" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View logs
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {topFuelConsumers.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Fuel className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No fuel logs this month</p>
              </div>
            ) : (
              <ul>
                {topFuelConsumers.map((v, i) => (
                  <li
                    key={v.id}
                    className={cn(
                      'px-6 py-3 flex items-center justify-between',
                      i !== topFuelConsumers.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">
                        {v.vehicle?.plateNumber ?? v.id}
                      </p>
                      {v.vehicle && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">{v.vehicle.model}</p>
                      )}
                    </div>
                    <span className="text-[13px] text-zinc-700 tabular-nums whitespace-nowrap">
                      {formatCompactCurrency(v.cost)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Recent Activity</CardTitle>
            <Link to="logs" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Inbox className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No activity yet</p>
              </div>
            ) : (
              <ul>
                {recentActivity.map((entry, i) => (
                  <li
                    key={entry.id}
                    className={cn(
                      'px-6 py-3',
                      i !== recentActivity.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-zinc-900">{entry.userName}</p>
                        <p className="text-[12px] text-zinc-600 truncate mt-0.5">{entry.detail}</p>
                      </div>
                      <span className="text-[11px] text-zinc-400 whitespace-nowrap mt-0.5">
                        {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <QualityStrip module="fleet" />
      </motion.div>

      <IssueDetailDrawer
        open={!!selectedIssue}
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {fleetAlerts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex-row items-center justify-between flex">
              <CardTitle>Open Alerts</CardTitle>
              <Link to="alerts" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
                See all alerts
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <ul>
                {fleetAlerts.map((n, i) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-6 py-3 flex items-start gap-3',
                      i !== fleetAlerts.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <n.icon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{n.title}</p>
                      <p className="text-[12px] text-zinc-500 truncate">{n.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </motion.div>
  )
}
