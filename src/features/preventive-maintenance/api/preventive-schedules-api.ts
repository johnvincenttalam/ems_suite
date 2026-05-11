import { addDays, addMonths, addWeeks, format, parseISO } from 'date-fns'
import type {
  IntervalUnit,
  PreventiveSchedule,
  ScheduleStatus,
} from '@/features/preventive-maintenance/types'
import { mockPreventiveSchedules } from '@/features/preventive-maintenance/data/mock-preventive-schedules'
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api'
import type { WorkOrder, WorkOrderPriority } from '@/features/maintenance/types'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
import { mockUsers } from '@/features/users/data/mock-users'
import { mockAssets } from '@/features/assets/data/mock-assets'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 300 + 200))

let scheduleCounter = mockPreventiveSchedules.reduce((max, s) => {
  const m = s.id.match(/^PM-\d{4}-(\d{4})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextScheduleId(): string {
  scheduleCounter += 1
  const year = new Date().getFullYear()
  return `PM-${year}-${String(scheduleCounter).padStart(4, '0')}`
}

function userName(userId: string): string {
  return mockUsers.find((u) => u.id === userId)?.name ?? userId
}

function assetLabel(assetId: string): string {
  const a = mockAssets.find((x) => x.id === assetId)
  return a ? `${a.name} (${a.assetCode})` : assetId
}

/** Advance a date by an interval, returning an ISO date string (YYYY-MM-DD). */
function advance(fromIso: string, unit: IntervalUnit, value: number): string {
  const base = parseISO(fromIso)
  const next =
    unit === 'days'   ? addDays(base, value)
    : unit === 'weeks'  ? addWeeks(base, value)
    : addMonths(base, value)
  return format(next, 'yyyy-MM-dd')
}

interface CreateScheduleInput {
  title: string
  assetId: string
  intervalUnit: IntervalUnit
  intervalValue: number
  lastServiceDate: string
  priority: WorkOrderPriority
  defaultAssigneeId: string
  checklistId?: string
  notes?: string
  createdBy: string
}

interface UpdateScheduleInput {
  title?: string
  intervalUnit?: IntervalUnit
  intervalValue?: number
  lastServiceDate?: string
  priority?: WorkOrderPriority
  defaultAssigneeId?: string
  checklistId?: string
  notes?: string
}

/**
 * Preventive maintenance scheduling. A `PreventiveSchedule` is a recurring rule
 * that generates `WorkOrder`s when due. The lifecycle here is intentionally
 * thin: `create`, `update`, `pause/resume`, and `generateDueWorkOrder` (the
 * only side-effecting operation that touches another module).
 */
export const preventiveSchedulesApi = {
  list: async (): Promise<PreventiveSchedule[]> => {
    await delay()
    return [...mockPreventiveSchedules].sort((a, b) =>
      a.nextServiceDate.localeCompare(b.nextServiceDate),
    )
  },

  /** Schedules whose next service date is on or before `asOf` and are active. */
  listDue: async (asOf: string = format(new Date(), 'yyyy-MM-dd')): Promise<PreventiveSchedule[]> => {
    await delay(120)
    return mockPreventiveSchedules.filter(
      (s) => s.status === 'active' && s.nextServiceDate <= asOf,
    )
  },

  create: async (input: CreateScheduleInput): Promise<PreventiveSchedule> => {
    await delay(150)
    if (input.intervalValue <= 0) throw new Error('Interval value must be positive')

    const now = new Date().toISOString()
    const schedule: PreventiveSchedule = {
      id: nextScheduleId(),
      title: input.title,
      assetId: input.assetId,
      intervalUnit: input.intervalUnit,
      intervalValue: input.intervalValue,
      lastServiceDate: input.lastServiceDate,
      nextServiceDate: advance(input.lastServiceDate, input.intervalUnit, input.intervalValue),
      status: 'active',
      priority: input.priority,
      defaultAssigneeId: input.defaultAssigneeId,
      checklistId: input.checklistId,
      notes: input.notes,
      createdAt: now,
      createdBy: input.createdBy,
    }
    mockPreventiveSchedules.push(schedule)

    recordAudit({
      userId: userName(input.createdBy),
      action: 'create',
      module: 'Maintenance',
      detail: `Created PM schedule ${schedule.id} — ${schedule.title} on ${assetLabel(schedule.assetId)} every ${schedule.intervalValue} ${schedule.intervalUnit}`,
    })
    return schedule
  },

  update: async (id: string, patch: UpdateScheduleInput, byUserId: string): Promise<PreventiveSchedule> => {
    await delay(120)
    const schedule = mockPreventiveSchedules.find((s) => s.id === id)
    if (!schedule) throw new Error(`PM schedule ${id} not found`)
    if (patch.intervalValue !== undefined && patch.intervalValue <= 0) {
      throw new Error('Interval value must be positive')
    }

    if (patch.title !== undefined) schedule.title = patch.title
    if (patch.priority !== undefined) schedule.priority = patch.priority
    if (patch.defaultAssigneeId !== undefined) schedule.defaultAssigneeId = patch.defaultAssigneeId
    if (patch.checklistId !== undefined) schedule.checklistId = patch.checklistId || undefined
    if (patch.notes !== undefined) schedule.notes = patch.notes || undefined

    const intervalChanged =
      (patch.intervalUnit !== undefined && patch.intervalUnit !== schedule.intervalUnit) ||
      (patch.intervalValue !== undefined && patch.intervalValue !== schedule.intervalValue) ||
      (patch.lastServiceDate !== undefined && patch.lastServiceDate !== schedule.lastServiceDate)

    if (patch.intervalUnit !== undefined) schedule.intervalUnit = patch.intervalUnit
    if (patch.intervalValue !== undefined) schedule.intervalValue = patch.intervalValue
    if (patch.lastServiceDate !== undefined) schedule.lastServiceDate = patch.lastServiceDate
    if (intervalChanged) {
      schedule.nextServiceDate = advance(
        schedule.lastServiceDate,
        schedule.intervalUnit,
        schedule.intervalValue,
      )
    }

    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `Updated PM schedule ${schedule.id}`,
    })
    return schedule
  },

  setStatus: async (id: string, status: ScheduleStatus, byUserId: string): Promise<PreventiveSchedule> => {
    await delay(80)
    const schedule = mockPreventiveSchedules.find((s) => s.id === id)
    if (!schedule) throw new Error(`PM schedule ${id} not found`)
    if (schedule.status === status) return schedule

    schedule.status = status
    recordAudit({
      userId: userName(byUserId),
      action: 'update',
      module: 'Maintenance',
      detail: `${status === 'paused' ? 'Paused' : 'Resumed'} PM schedule ${schedule.id}`,
    })
    return schedule
  },

  /**
   * Generate a pending work order from a due schedule. Advances the
   * schedule's `lastServiceDate` to today and bumps `nextServiceDate` by the
   * interval. The generated WO is type='preventive' and gets the schedule's
   * priority + default assignee + checklist (if any).
   *
   * Refuses if the schedule is paused or not yet due — callers pass `force`
   * to override the due-date check (e.g. ops wants to run it early).
   */
  generateDueWorkOrder: async (
    id: string,
    byUserId: string,
    options: { force?: boolean } = {},
  ): Promise<{ schedule: PreventiveSchedule; workOrder: WorkOrder }> => {
    await delay(150)
    const schedule = mockPreventiveSchedules.find((s) => s.id === id)
    if (!schedule) throw new Error(`PM schedule ${id} not found`)
    if (schedule.status !== 'active') throw new Error('PM schedule is paused')

    const today = format(new Date(), 'yyyy-MM-dd')
    if (!options.force && schedule.nextServiceDate > today) {
      throw new Error(`PM schedule is not due until ${schedule.nextServiceDate}`)
    }

    const workOrder = await maintenanceApi.create({
      title: schedule.title,
      description: schedule.notes,
      assetId: schedule.assetId,
      assignedTo: schedule.defaultAssigneeId,
      type: 'preventive',
      priority: schedule.priority,
      scheduledDate: schedule.nextServiceDate < today ? today : schedule.nextServiceDate,
      checklistId: schedule.checklistId,
      createdBy: byUserId,
    })

    schedule.lastServiceDate = today
    schedule.nextServiceDate = advance(today, schedule.intervalUnit, schedule.intervalValue)

    recordAudit({
      userId: userName(byUserId),
      action: 'create',
      module: 'Maintenance',
      detail: `Generated ${workOrder.id} from PM schedule ${schedule.id} — next due ${schedule.nextServiceDate}`,
    })

    return { schedule, workOrder }
  },
}
