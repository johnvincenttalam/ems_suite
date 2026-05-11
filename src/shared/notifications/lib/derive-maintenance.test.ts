import { describe, it, expect } from 'vitest'
import { deriveMaintenanceNotifications } from './derive-maintenance'
import type { WorkOrder } from '@/features/maintenance'

const NOW = new Date('2026-04-30T12:00:00Z')

function wo(p: Partial<WorkOrder>): WorkOrder {
  return {
    id: 'WO-X',
    assetId: 'AST-001',
    title: 'Inspect',
    type: 'preventive',
    priority: 'medium',
    assignedTo: 'U999',
    status: 'pending',
    scheduledDate: '2026-05-15',
    createdAt: '2026-04-20T08:00:00Z',
    createdBy: 'U001',
    ...p,
  }
}

describe('deriveMaintenanceNotifications — overdue', () => {
  it('emits wo_overdue when scheduledDate is past for the assignee', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-04-25' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'wo_overdue' && n.id === 'wo-overdue:WO-1')).toBe(true)
  })

  it('does not emit overdue if order is completed', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', status: 'completed', scheduledDate: '2026-04-25' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'wo_overdue')).toBe(false)
  })

  it('does not emit for non-assignees', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-04-25' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U999', NOW)
    expect(notifs).toEqual([])
  })
})

describe('deriveMaintenanceNotifications — due_soon', () => {
  it('emits wo_due_soon for orders within 2 days', () => {
    const orders = [
      wo({ id: 'WO-A', assignedTo: 'U002', scheduledDate: '2026-04-30' }),
      wo({ id: 'WO-B', assignedTo: 'U002', scheduledDate: '2026-05-01' }),
      wo({ id: 'WO-C', assignedTo: 'U002', scheduledDate: '2026-05-02' }),
    ]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    const soonIds = notifs.filter((n) => n.kind === 'wo_due_soon').map((n) => n.id)
    expect(soonIds.sort()).toEqual(['wo-soon:WO-A', 'wo-soon:WO-B', 'wo-soon:WO-C'])
  })

  it('uses danger severity for critical priority', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-04-30', priority: 'critical' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(notifs[0].severity).toBe('danger')
  })

  it('uses warning severity for non-critical priorities', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-04-30', priority: 'medium' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(notifs[0].severity).toBe('warning')
  })
})

describe('deriveMaintenanceNotifications — assigned', () => {
  it('emits wo_assigned for pending orders scheduled further out', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-05-20', status: 'pending' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'wo_assigned')).toBe(true)
  })

  it('does not emit wo_assigned for ongoing orders', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-05-20', status: 'ongoing' })]
    const notifs = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(notifs.some((n) => n.kind === 'wo_assigned')).toBe(false)
  })
})

describe('deriveMaintenanceNotifications — output', () => {
  it('produces stable IDs across calls', () => {
    const orders = [wo({ id: 'WO-1', assignedTo: 'U002', scheduledDate: '2026-04-25' })]
    const a = deriveMaintenanceNotifications(orders, 'U002', NOW)
    const b = deriveMaintenanceNotifications(orders, 'U002', NOW)
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id))
  })
})
