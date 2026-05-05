import { useMemo } from 'react'
import {
  Truck,
  Fuel,
  Wrench,
  Route as RouteIcon,
  TrendingUp,
  Tag,
  Loader2,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { format, parseISO, subMonths } from 'date-fns'
import { useVehicles, useTrips, useFuelLogs } from '@/features/fleet'
import { useUsers } from '@/features/users'
import type { FuelType, VehicleStatus } from '@/features/fleet'
import { ExportMenu, StatCard, StatCardSkeleton } from '@/shared/ui/index'
import { PageHeader } from '@/shared/ui/page-header'
import type { ExportColumn } from '@/shared/utils/export-prep'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

interface BreakdownRow {
  key: string
  label: string
  count: number
  amount: number
  percent: number
}

const STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  retired: 'Retired',
}

const FUEL_LABEL: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  electric: 'Electric',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

export function FleetReportsPage() {
  const { data: vehicles = [], isLoading } = useVehicles()
  const { data: trips = [] } = useTrips()
  const { data: fuelLogs = [] } = useFuelLogs()
  const { data: users = [] } = useUsers()

  const stats = useMemo(() => {
    const total = vehicles.length
    const active = vehicles.filter((v) => v.status === 'active').length
    const inMaintenance = vehicles.filter((v) => v.status === 'maintenance').length
    const retired = vehicles.filter((v) => v.status === 'retired').length
    const totalDistance = trips
      .filter((t) => t.status === 'completed')
      .reduce((s, t) => s + t.distance, 0)
    const totalFuelCost = fuelLogs.reduce((s, f) => s + f.totalCost, 0)
    const totalLiters = fuelLogs.reduce((s, f) => s + f.liters, 0)
    const avgCostPerKm = totalDistance === 0 ? 0 : totalFuelCost / totalDistance
    const completedTrips = trips.filter((t) => t.status === 'completed').length
    const inProgressTrips = trips.filter((t) => t.status === 'in_progress').length
    const availability = total === 0 ? 100 : Math.round((active / Math.max(1, active + inMaintenance)) * 100)
    return {
      total,
      active,
      inMaintenance,
      retired,
      totalDistance,
      totalFuelCost,
      totalLiters,
      avgCostPerKm,
      completedTrips,
      inProgressTrips,
      availability,
    }
  }, [vehicles, trips, fuelLogs])

  const monthlyTrend = useMemo(() => {
    const now = new Date()
    const buckets: { month: string; key: string; cost: number; liters: number; distance: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i)
      buckets.push({ month: format(d, 'MMM'), key: format(d, 'yyyy-MM'), cost: 0, liters: 0, distance: 0 })
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
    for (const t of trips) {
      if (t.status !== 'completed' || !t.endTime) continue
      const k = format(parseISO(t.endTime), 'yyyy-MM')
      const bucket = byKey.get(k)
      if (bucket) bucket.distance += t.distance
    }
    return buckets
  }, [fuelLogs, trips])

  const costPerVehicle = useMemo(() => {
    const totals = new Map<string, number>()
    const distances = new Map<string, number>()
    for (const f of fuelLogs) totals.set(f.vehicleId, (totals.get(f.vehicleId) ?? 0) + f.totalCost)
    for (const t of trips.filter((x) => x.status === 'completed')) {
      distances.set(t.vehicleId, (distances.get(t.vehicleId) ?? 0) + t.distance)
    }
    return Array.from(totals.entries())
      .map(([id, cost]) => {
        const v = vehicles.find((x) => x.id === id)
        const distance = distances.get(id) ?? 0
        return {
          key: id,
          label: v?.plateNumber ?? id,
          subLabel: v?.model ?? '',
          count: distance,
          amount: cost,
          percent: 0,
          costPerKm: distance === 0 ? 0 : cost / distance,
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [fuelLogs, trips, vehicles])

  const byStatus = useMemo<BreakdownRow[]>(() => {
    const counts = new Map<VehicleStatus, number>()
    for (const v of vehicles) counts.set(v.status, (counts.get(v.status) ?? 0) + 1)
    const total = vehicles.length
    return Array.from(counts.entries())
      .map(([k, count]) => ({
        key: k,
        label: STATUS_LABEL[k],
        count,
        amount: count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [vehicles])

  const byFuelType = useMemo<BreakdownRow[]>(() => {
    const counts = new Map<FuelType, number>()
    for (const v of vehicles) counts.set(v.fuelType, (counts.get(v.fuelType) ?? 0) + 1)
    const total = vehicles.length
    return Array.from(counts.entries())
      .map(([k, count]) => ({
        key: k,
        label: FUEL_LABEL[k],
        count,
        amount: count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [vehicles])

  const exportRows = useMemo(
    () =>
      vehicles.map((v) => {
        const cost = fuelLogs
          .filter((f) => f.vehicleId === v.id)
          .reduce((s, f) => s + f.totalCost, 0)
        const distance = trips
          .filter((t) => t.vehicleId === v.id && t.status === 'completed')
          .reduce((s, t) => s + t.distance, 0)
        return {
          plate: v.plateNumber,
          model: v.model,
          year: v.year,
          status: STATUS_LABEL[v.status],
          fuelType: FUEL_LABEL[v.fuelType],
          odometer: v.currentOdometer,
          driver: v.assignedDriverId ? users.find((u) => u.id === v.assignedDriverId)?.name ?? v.assignedDriverId : '',
          totalCost: cost,
          totalDistance: distance,
          costPerKm: distance === 0 ? 0 : cost / distance,
        }
      }),
    [vehicles, fuelLogs, trips, users],
  )

  const exportColumns: ExportColumn[] = [
    { key: 'plate', label: 'Plate' },
    { key: 'model', label: 'Model' },
    { key: 'year', label: 'Year' },
    { key: 'status', label: 'Status' },
    { key: 'fuelType', label: 'Fuel' },
    { key: 'odometer', label: 'Odometer' },
    { key: 'driver', label: 'Driver' },
    { key: 'totalCost', label: 'Fuel Cost' },
    { key: 'totalDistance', label: 'Distance (km)' },
    { key: 'costPerKm', label: 'Cost / km' },
  ]

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Fuel cost, distance, and per-vehicle efficiency" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Fuel cost, distance, and per-vehicle efficiency"
        actions={
          <ExportMenu
            rows={exportRows}
            baseFilename="fleet-report"
            sheetName="Fleet"
            pdfTitle="Fleet Performance Report"
            pdfSubtitle={`${exportRows.length} vehicle${exportRows.length === 1 ? '' : 's'}`}
            columns={exportColumns}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Vehicles" value={stats.total} subtitle={`${stats.active} active`} icon={Truck} iconBg="bg-sky-50" iconColor="text-sky-600" index={0} />
        <StatCard title="Availability" value={`${stats.availability}%`} subtitle={`${stats.inMaintenance} in maintenance`} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={1} />
        <StatCard title="Total Fuel Cost" value={formatCompactCurrency(stats.totalFuelCost)} subtitle={`${Math.round(stats.totalLiters).toLocaleString()} L`} icon={Fuel} iconBg="bg-amber-50" iconColor="text-amber-600" index={2} />
        <StatCard title="Avg Cost / km" value={stats.avgCostPerKm > 0 ? formatCurrency(stats.avgCostPerKm) : '—'} subtitle="Across all trips" icon={Tag} iconBg="bg-violet-50" iconColor="text-violet-600" index={3} />
        <StatCard title="Distance Logged" value={`${stats.totalDistance.toLocaleString()} km`} icon={RouteIcon} iconBg="bg-blue-50" iconColor="text-blue-600" index={4} />
        <StatCard title="Trips" value={stats.completedTrips} subtitle={`${stats.inProgressTrips} in progress`} icon={Loader2} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={5} />
        <StatCard title="In Maintenance" value={stats.inMaintenance} icon={Wrench} iconBg="bg-orange-50" iconColor="text-orange-600" index={6} />
        <StatCard title="Retired" value={stats.retired} icon={Zap} iconBg="bg-zinc-100" iconColor="text-zinc-500" index={7} />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Monthly Fleet Cost & Distance</h3>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Last 6 months</span>
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="cost" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
              <YAxis yAxisId="distance" orientation="right" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}km`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar yAxisId="cost" dataKey="cost" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="Fuel Cost" />
              <Bar yAxisId="distance" dataKey="distance" fill="#10b981" radius={[6, 6, 0, 0]} name="Distance (km)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CostPerVehicleCard rows={costPerVehicle} />
        <BreakdownCard title="By Status" rows={byStatus} icon={Truck} barColor="bg-emerald-500" />
        <BreakdownCard title="By Fuel Type" rows={byFuelType} icon={Fuel} barColor="bg-amber-500" />
      </div>
    </div>
  )
}

function CostPerVehicleCard({
  rows,
}: {
  rows: { key: string; label: string; subLabel: string; amount: number; count: number; costPerKm: number }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.amount))
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">Cost per Vehicle (all-time)</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{rows.length} ranked</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No fuel logs yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-zinc-700 font-mono truncate">{r.label}</p>
                  {r.subLabel && <p className="text-zinc-400 text-[11px] truncate">{r.subLabel}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-zinc-700 tabular-nums">{formatCompactCurrency(r.amount)}</p>
                  <p className="text-zinc-400 text-[11px] tabular-nums">
                    {r.count.toLocaleString()} km
                    {r.costPerKm > 0 && <> · {formatCurrency(r.costPerKm)}/km</>}
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full rounded-full transition-all bg-sky-500" style={{ width: `${(r.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BreakdownCard({
  title,
  rows,
  icon: Icon,
  barColor,
}: {
  title: string
  rows: BreakdownRow[]
  icon: typeof Truck
  barColor: string
}) {
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount))
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
          {rows.reduce((s, r) => s + r.count, 0)} total
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-700 truncate flex-1 mr-3">{r.label}</span>
                <span className="text-zinc-400 tabular-nums flex-shrink-0">
                  {r.count} <span className="text-zinc-300">·</span> {r.percent}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${(r.amount / maxAmount) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
