import type { WorkOrderPriority } from '@/features/maintenance/types'

/**
 * Time-based interval units — advance `nextServiceDate` on generation.
 */
export type TimeIntervalUnit = 'days' | 'weeks' | 'months'

/**
 * Usage-based interval units — advance based on the asset's meter reading.
 * The asset must have a matching `meterUnit` set.
 */
export type UsageIntervalUnit = 'hours' | 'kilometers' | 'cycles'

export type IntervalUnit = TimeIntervalUnit | UsageIntervalUnit

export type ScheduleStatus = 'active' | 'paused'

/**
 * A preventive maintenance schedule. Two shapes share this record:
 *
 *  - time-based   (intervalUnit ∈ days/weeks/months): driven by
 *    `lastServiceDate` + interval; `nextServiceDate` is the trigger.
 *  - usage-based  (intervalUnit ∈ hours/km/cycles): driven by
 *    `lastServiceMeter` + interval; due when the asset's currentMeter
 *    reaches `lastServiceMeter + intervalValue`. `nextServiceDate` is
 *    informational only — set to today on creation as a placeholder so
 *    list sorting still works.
 */
export interface PreventiveSchedule {
  id: string
  title: string
  /** Exactly one of `assetId` or `vehicleId` must be set. */
  assetId?: string
  vehicleId?: string
  intervalUnit: IntervalUnit
  intervalValue: number
  /** ISO date (YYYY-MM-DD). Last completion date for the schedule. Always
   * set; for usage-based schedules it's informational. */
  lastServiceDate: string
  /** ISO date. Computed from lastServiceDate + interval for time-based;
   * mirrors lastServiceDate for usage-based (the meter drives the trigger). */
  nextServiceDate: string
  /** Usage-based only: meter reading at the last service. Trigger fires
   * when the asset's `currentMeter ≥ lastServiceMeter + intervalValue`. */
  lastServiceMeter?: number
  status: ScheduleStatus
  priority: WorkOrderPriority
  /** Technician assigned by default when this schedule auto-generates a WO. */
  defaultAssigneeId: string
  /** Optional inspection checklist applied to each generated WO. */
  checklistId?: string
  /** Free-form notes (scope, references). Carried into the WO description. */
  notes?: string
  createdAt: string
  createdBy: string
}

export const INTERVAL_UNIT_LABEL: Record<IntervalUnit, string> = {
  days: 'days',
  weeks: 'weeks',
  months: 'months',
  hours: 'hours',
  kilometers: 'km',
  cycles: 'cycles',
}

export const USAGE_INTERVAL_UNITS: UsageIntervalUnit[] = ['hours', 'kilometers', 'cycles']

export function isUsageInterval(unit: IntervalUnit): unit is UsageIntervalUnit {
  return unit === 'hours' || unit === 'kilometers' || unit === 'cycles'
}
