import { describe, it, expect } from 'vitest'
import { format, parseISO, addDays, addMonths, subDays, subMonths } from 'date-fns'
import { preventiveSchedulesApi } from './api/preventive-schedules-api'
import { maintenanceApi } from '@/features/maintenance'
import { mockAssets } from '@/features/assets'
import { mockUsers } from '@/features/users'

const todayIso = () => format(new Date(), 'yyyy-MM-dd')

async function newSchedule(
  overrides: Partial<{
    title: string
    assetId: string
    intervalUnit: 'days' | 'weeks' | 'months'
    intervalValue: number
    lastServiceDate: string
    defaultAssigneeId: string
  }> = {},
) {
  return preventiveSchedulesApi.create({
    title: overrides.title ?? 'Test PM schedule',
    assetId: overrides.assetId ?? 'AST-011',
    intervalUnit: overrides.intervalUnit ?? 'months',
    intervalValue: overrides.intervalValue ?? 1,
    lastServiceDate: overrides.lastServiceDate ?? format(subMonths(new Date(), 2), 'yyyy-MM-dd'),
    priority: 'medium',
    defaultAssigneeId: overrides.defaultAssigneeId ?? 'U002',
    createdBy: 'U001',
  })
}

describe('preventiveSchedulesApi.create — usage-based', () => {
  it('rejects a usage interval when the asset has no meterUnit', async () => {
    await expect(
      preventiveSchedulesApi.create({
        title: 'Bad usage PM',
        assetId: 'AST-001', // a laptop, no meter
        intervalUnit: 'hours',
        intervalValue: 500,
        lastServiceDate: '2026-01-01',
        lastServiceMeter: 100,
        priority: 'medium',
        defaultAssigneeId: 'U002',
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/meterUnit/i)
  })

  it('rejects when lastServiceMeter is missing on a usage schedule', async () => {
    await expect(
      preventiveSchedulesApi.create({
        title: 'Missing meter PM',
        assetId: 'AST-010', // has hours meter
        intervalUnit: 'hours',
        intervalValue: 250,
        lastServiceDate: '2026-01-01',
        priority: 'medium',
        defaultAssigneeId: 'U002',
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/lastServiceMeter is required/i)
  })

  it('creates a usage-based schedule and stamps lastServiceMeter', async () => {
    const created = await preventiveSchedulesApi.create({
      title: 'Genset 250h',
      assetId: 'AST-010',
      intervalUnit: 'hours',
      intervalValue: 250,
      lastServiceDate: '2026-01-01',
      lastServiceMeter: 500,
      priority: 'medium',
      defaultAssigneeId: 'U003',
      createdBy: 'U001',
    })
    expect(created.lastServiceMeter).toBe(500)
    expect(created.intervalUnit).toBe('hours')
  })
})

describe('preventiveSchedulesApi.generateDueWorkOrder — usage-based', () => {
  it('refuses to generate when meter has not reached the trigger', async () => {
    // AST-010 currentMeter is 1480; lastServiceMeter 1400 + 250 = 1650 > 1480.
    const s = await preventiveSchedulesApi.create({
      title: 'Not due yet',
      assetId: 'AST-010',
      intervalUnit: 'hours',
      intervalValue: 250,
      lastServiceDate: '2026-01-01',
      lastServiceMeter: 1400,
      priority: 'medium',
      defaultAssigneeId: 'U003',
      createdBy: 'U001',
    })
    await expect(preventiveSchedulesApi.generateDueWorkOrder(s.id, 'U001')).rejects.toThrow(/not due until meter/i)
  })

  it('generates and advances lastServiceMeter when meter has reached the trigger', async () => {
    // AST-011 currentMeter 3275; choose lastServiceMeter so the schedule is due.
    const s = await preventiveSchedulesApi.create({
      title: 'Due usage PM',
      assetId: 'AST-011',
      intervalUnit: 'hours',
      intervalValue: 500,
      lastServiceDate: '2026-01-01',
      lastServiceMeter: 2700, // 2700 + 500 = 3200 ≤ 3275
      priority: 'medium',
      defaultAssigneeId: 'U002',
      createdBy: 'U001',
    })
    const { schedule, workOrder } = await preventiveSchedulesApi.generateDueWorkOrder(s.id, 'U001')
    expect(workOrder.type).toBe('preventive')
    expect(workOrder.status).toBe('pending')
    expect(schedule.lastServiceMeter).toBe(3275)
  })
})

describe('preventiveSchedulesApi.list', () => {
  it('returns schedules sorted by nextServiceDate ascending', async () => {
    const result = await preventiveSchedulesApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].nextServiceDate <= result[i].nextServiceDate).toBe(true)
    }
  })

  it('every schedule references a known asset and user', async () => {
    const result = await preventiveSchedulesApi.list()
    const assetIds = new Set(mockAssets.map((a) => a.id))
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((s) => !!s.assetId && assetIds.has(s.assetId))).toBe(true)
    expect(result.every((s) => userIds.has(s.defaultAssigneeId))).toBe(true)
  })

  it('every schedule has a positive interval value', async () => {
    const result = await preventiveSchedulesApi.list()
    expect(result.every((s) => s.intervalValue > 0)).toBe(true)
  })
})

describe('preventiveSchedulesApi.create', () => {
  it('creates an active schedule with computed nextServiceDate', async () => {
    const last = '2026-01-01'
    const s = await newSchedule({ lastServiceDate: last, intervalUnit: 'months', intervalValue: 3 })
    expect(s.status).toBe('active')
    expect(s.id).toMatch(/^PM-\d{4}-\d{4}$/)
    expect(s.lastServiceDate).toBe(last)
    expect(s.nextServiceDate).toBe(format(addMonths(parseISO(last), 3), 'yyyy-MM-dd'))
  })

  it('rejects intervalValue <= 0', async () => {
    await expect(
      preventiveSchedulesApi.create({
        title: 'bad',
        assetId: 'AST-011',
        intervalUnit: 'days',
        intervalValue: 0,
        lastServiceDate: '2026-01-01',
        priority: 'low',
        defaultAssigneeId: 'U002',
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/positive/i)
  })
})

describe('preventiveSchedulesApi.update', () => {
  it('updates title without touching nextServiceDate', async () => {
    const s = await newSchedule()
    const original = s.nextServiceDate
    const updated = await preventiveSchedulesApi.update(s.id, { title: 'Renamed PM' }, 'U001')
    expect(updated.title).toBe('Renamed PM')
    expect(updated.nextServiceDate).toBe(original)
  })

  it('recomputes nextServiceDate when interval changes', async () => {
    const last = '2026-03-01'
    const s = await newSchedule({ lastServiceDate: last, intervalUnit: 'days', intervalValue: 30 })
    const updated = await preventiveSchedulesApi.update(s.id, { intervalUnit: 'days', intervalValue: 7 }, 'U001')
    expect(updated.nextServiceDate).toBe(format(addDays(parseISO(last), 7), 'yyyy-MM-dd'))
  })
})

describe('preventiveSchedulesApi.setStatus', () => {
  it('pauses an active schedule and resumes it', async () => {
    const s = await newSchedule()
    const paused = await preventiveSchedulesApi.setStatus(s.id, 'paused', 'U001')
    expect(paused.status).toBe('paused')
    const resumed = await preventiveSchedulesApi.setStatus(s.id, 'active', 'U001')
    expect(resumed.status).toBe('active')
  })
})

describe('preventiveSchedulesApi.generateDueWorkOrder', () => {
  it('generates a pending preventive WO from a due schedule and advances the schedule', async () => {
    const due = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const s = await newSchedule({ lastServiceDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), intervalUnit: 'days', intervalValue: 1 })
    // Force the schedule's nextServiceDate to be in the past for this test.
    await preventiveSchedulesApi.update(s.id, { lastServiceDate: due, intervalUnit: 'days', intervalValue: 1 }, 'U001')

    const { schedule, workOrder } = await preventiveSchedulesApi.generateDueWorkOrder(s.id, 'U001')
    expect(workOrder.status).toBe('pending')
    expect(workOrder.type).toBe('preventive')
    expect(workOrder.assetId).toBe(s.assetId)

    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    expect(schedule.lastServiceDate).toBe(todayIso())
    expect(schedule.nextServiceDate).toBe(tomorrow)

    // Confirm the WO actually landed in the maintenance list.
    const list = await maintenanceApi.list()
    expect(list.some((w) => w.id === workOrder.id)).toBe(true)
  })

  it('refuses when the schedule is paused', async () => {
    const s = await newSchedule()
    await preventiveSchedulesApi.setStatus(s.id, 'paused', 'U001')
    await expect(preventiveSchedulesApi.generateDueWorkOrder(s.id, 'U001')).rejects.toThrow(/paused/i)
  })

  it('refuses when the schedule is not yet due (without force)', async () => {
    const future = format(addMonths(new Date(), 6), 'yyyy-MM-dd')
    const s = await newSchedule({ lastServiceDate: future, intervalUnit: 'months', intervalValue: 1 })
    await expect(preventiveSchedulesApi.generateDueWorkOrder(s.id, 'U001')).rejects.toThrow(/not due/i)
  })

  it('allows generation when forced even if not due', async () => {
    const future = format(addMonths(new Date(), 6), 'yyyy-MM-dd')
    const s = await newSchedule({ lastServiceDate: future, intervalUnit: 'months', intervalValue: 1 })
    const { workOrder } = await preventiveSchedulesApi.generateDueWorkOrder(s.id, 'U001', { force: true })
    expect(workOrder.type).toBe('preventive')
  })
})
