import type { WorkOrderPriority } from '@/features/maintenance/types'

/**
 * Interval unit for a preventive schedule. Only time-based units auto-advance
 * `nextServiceDate` on work-order generation. Usage-based units (engine hours,
 * kilometers, cycles) would need asset meter readings to advance — they aren't
 * supported yet but the type is intentionally extensible so adding them later
 * doesn't require a model migration.
 */
export type IntervalUnit = 'days' | 'weeks' | 'months'

export type ScheduleStatus = 'active' | 'paused'

export interface PreventiveSchedule {
  id: string
  title: string
  assetId: string
  intervalUnit: IntervalUnit
  intervalValue: number
  /** ISO date (YYYY-MM-DD). The last time service ran for this schedule. */
  lastServiceDate: string
  /** ISO date. Computed from lastServiceDate + interval; advanced on generate. */
  nextServiceDate: string
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
}
