import { startOfMonth, subMonths, parseISO, isAfter } from 'date-fns'
import type { FuelLog, Trip, Vehicle } from '@/features/fleet'
import type { Insight } from '@/shared/insights/types'

const PCT_THRESHOLD = 10

function pctChange(now: number, prior: number): number | null {
  if (prior === 0) return null
  return Math.round(((now - prior) / prior) * 100)
}

/** Fleet insights — fuel trend, most-active vehicle. */
export function deriveFleetInsights(
  vehicles: Vehicle[],
  trips: Trip[],
  fuelLogs: FuelLog[],
  now: Date = new Date(),
): Insight[] {
  const insights: Insight[] = []

  // Fuel cost MTD vs prior month.
  const monthStart = startOfMonth(now)
  const priorMonthStart = startOfMonth(subMonths(now, 1))
  let fuelMTD = 0
  let fuelPrior = 0
  for (const f of fuelLogs) {
    const at = parseISO(f.date)
    if (isAfter(at, monthStart)) fuelMTD += f.totalCost
    else if (isAfter(at, priorMonthStart)) fuelPrior += f.totalCost
  }
  const delta = pctChange(fuelMTD, fuelPrior)
  if (delta !== null && Math.abs(delta) >= PCT_THRESHOLD) {
    insights.push({
      id: 'fleet:fuel-delta',
      message:
        delta > 0
          ? `Fuel cost up ${delta}% vs last month`
          : `Fuel cost down ${Math.abs(delta)}% vs last month`,
      severity: delta > 0 ? 'warning' : 'info',
      module: 'fleet',
      metric: `${delta > 0 ? '+' : ''}${delta}%`,
      href: '/module/fleet/reports',
    })
  }

  // Most-active vehicle this month (by completed trip count).
  const tripCount = new Map<string, number>()
  for (const t of trips) {
    if (t.status !== 'completed' || !t.endTime) continue
    if (!isAfter(parseISO(t.endTime), monthStart)) continue
    tripCount.set(t.vehicleId, (tripCount.get(t.vehicleId) ?? 0) + 1)
  }
  if (tripCount.size > 0) {
    const top = Array.from(tripCount.entries()).sort((a, b) => b[1] - a[1])[0]
    const vehicle = vehicles.find((v) => v.id === top[0])
    if (vehicle) {
      insights.push({
        id: 'fleet:top-vehicle',
        message: `Most active vehicle this month: ${vehicle.plateNumber} (${top[1]} trips)`,
        severity: 'info',
        module: 'fleet',
      })
    }
  }

  return insights
}
