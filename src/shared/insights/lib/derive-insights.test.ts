import { describe, it, expect } from 'vitest'
import { format, subMonths } from 'date-fns'
import { deriveInventoryInsights } from './derive-inventory'
import { deriveMaintenanceInsights } from './derive-maintenance'
import { deriveProcurementInsights } from './derive-procurement'
import { deriveAssetInsights } from './derive-assets'
import { deriveFleetInsights } from './derive-fleet'
import type { InventoryItem, StockMovement } from '@/features/inventory'
import type { WorkOrder } from '@/features/maintenance'
import type { PreventiveSchedule } from '@/features/preventive-maintenance'
import type { Asset } from '@/features/assets'
import type { RequestWithItems } from '@/features/procurement'
import type { Vehicle, Trip, FuelLog } from '@/features/fleet'

const NOW = new Date('2026-05-15T12:00:00Z')

function item(p: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'INV-X', sku: 'SKU', name: 'Widget', categoryId: 'C001', uomId: 'U001',
    warehouseId: 'W001', quantity: 100, reorderLevel: 20, createdAt: '2025-01-01',
    ...p,
  }
}

describe('deriveInventoryInsights', () => {
  it('emits a warning when items are below reorder but above the critical threshold', () => {
    // 15 of 20 = 75% of reorder — below the line, above the 25% critical cutoff.
    const items = [item({ id: 'A', quantity: 15, reorderLevel: 20 })]
    const result = deriveInventoryInsights(items, [], NOW)
    expect(result.some((i) => i.id === 'inv:low-stock' && i.severity === 'warning')).toBe(true)
  })

  it('escalates to critical when items are ≤ 25% of reorder level', () => {
    const items = [
      item({ id: 'A', quantity: 1, reorderLevel: 100 }), // 1% of reorder
      item({ id: 'B', quantity: 4, reorderLevel: 20 }),  // also critical
    ]
    const result = deriveInventoryInsights(items, [], NOW)
    const lowStock = result.find((i) => i.id === 'inv:low-stock')
    expect(lowStock?.severity).toBe('critical')
  })

  it('returns no insights when stock is healthy and no consumption recorded', () => {
    const items = [item({ id: 'A', quantity: 100, reorderLevel: 20 })]
    const result = deriveInventoryInsights(items, [], NOW)
    expect(result).toEqual([])
  })

  it('reports top-consumed item for the current month', () => {
    const items = [item({ id: 'A', name: 'Air Filter' }), item({ id: 'B', name: 'Oil' })]
    const movements: StockMovement[] = [
      { id: 'M1', itemId: 'A', type: 'out', quantity: 10, status: 'applied', createdAt: '2026-05-10T00:00:00Z', createdBy: 'u' },
      { id: 'M2', itemId: 'B', type: 'out', quantity: 3, status: 'applied', createdAt: '2026-05-10T00:00:00Z', createdBy: 'u' },
    ]
    const result = deriveInventoryInsights(items, movements, NOW)
    const top = result.find((i) => i.id === 'inv:top-consumed')
    expect(top?.message).toContain('Air Filter')
  })
})

function wo(p: Partial<WorkOrder>): WorkOrder {
  return {
    id: 'WO-X', assetId: 'AST-1', title: 'Test', type: 'preventive', priority: 'medium',
    assignedTo: 'U002', status: 'pending', scheduledDate: '2026-06-01',
    createdAt: '2026-04-01T00:00:00Z', createdBy: 'U001',
    ...p,
  }
}

describe('deriveMaintenanceInsights', () => {
  it('emits warning for overdue, critical when ≥ 5', () => {
    const past = '2026-04-01'
    const overdue = Array.from({ length: 5 }, (_, i) => wo({ id: `WO-${i}`, scheduledDate: past }))
    const result = deriveMaintenanceInsights(overdue, [], [], NOW)
    expect(result.find((i) => i.id === 'wo:overdue')?.severity).toBe('critical')
  })

  it('reports cost delta vs prior month when ≥ 10%', () => {
    const orders: WorkOrder[] = [
      // This month: 500 total
      wo({ id: '1', status: 'completed', completedDate: '2026-05-10T00:00:00Z', laborCost: 500 }),
      // Prior month: 100 total
      wo({ id: '2', status: 'completed', completedDate: '2026-04-10T00:00:00Z', laborCost: 100 }),
    ]
    const result = deriveMaintenanceInsights(orders, [], [], NOW)
    const delta = result.find((i) => i.id === 'wo:cost-delta')
    expect(delta?.metric).toMatch(/\+\d+%/)
  })

  it('reports due PM schedules (time-based)', () => {
    const schedules: PreventiveSchedule[] = [
      {
        id: 'PM-1', title: 'Test', assetId: 'AST-1', intervalUnit: 'months', intervalValue: 1,
        lastServiceDate: '2026-04-01', nextServiceDate: '2026-05-01',
        status: 'active', priority: 'medium', defaultAssigneeId: 'U002',
        createdAt: '2026-01-01', createdBy: 'U001',
      },
    ]
    const result = deriveMaintenanceInsights([], schedules, [], NOW)
    expect(result.some((i) => i.id === 'pm:due')).toBe(true)
  })
})

function req(p: Partial<RequestWithItems>): RequestWithItems {
  return {
    id: 'REQ-X', requesterId: 'U001', departmentId: 'D001', status: 'pending',
    createdAt: '2026-05-01T00:00:00Z', totalAmount: 1000, items: [],
    ...p,
  }
}

describe('deriveProcurementInsights', () => {
  it('counts pending approvals', () => {
    const result = deriveProcurementInsights([req({ status: 'pending' }), req({ id: '2', status: 'pending' })], NOW)
    expect(result.find((i) => i.id === 'proc:pending')?.metric).toBe('2')
  })

  it('flags spend delta vs prior month', () => {
    const result = deriveProcurementInsights(
      [
        req({ id: '1', status: 'approved', approvedAt: '2026-05-10T00:00:00Z', totalAmount: 1000 }),
        req({ id: '2', status: 'approved', approvedAt: '2026-04-10T00:00:00Z', totalAmount: 500 }),
      ],
      NOW,
    )
    expect(result.find((i) => i.id === 'proc:spend-delta')?.metric).toMatch(/\+\d+%/)
  })
})

function asset(p: Partial<Asset>): Asset {
  return {
    id: 'AST-1', assetCode: 'A-001', name: 'Generator', serialNumber: 'SN-1',
    categoryId: 'C001', locationId: 'W001', status: 'active', condition: 'good',
    purchaseDate: '2024-01-01', createdAt: '2024-01-01',
    ...p,
  }
}

describe('deriveAssetInsights', () => {
  it('flags poor-condition assets', () => {
    const assets = [asset({ id: 'A', condition: 'poor' })]
    const result = deriveAssetInsights(assets, [])
    expect(result.some((i) => i.id === 'asset:poor-condition')).toBe(true)
  })

  it('reports highest-cost asset', () => {
    const assets = [asset({ id: 'A', name: 'Genset' })]
    const orders: WorkOrder[] = [
      wo({ id: '1', assetId: 'A', status: 'completed', completedDate: '2026-05-01T00:00:00Z', laborCost: 1000 }),
    ]
    const result = deriveAssetInsights(assets, orders)
    expect(result.find((i) => i.id === 'asset:top-cost')?.message).toContain('Genset')
  })
})

function vehicle(p: Partial<Vehicle>): Vehicle {
  return {
    id: 'V-1', plateNumber: 'ABC-123', model: 'Hilux', year: 2024, status: 'active',
    fuelType: 'diesel', currentOdometer: 10000, createdAt: '2024-01-01',
    ...p,
  }
}

describe('deriveFleetInsights', () => {
  it('flags fuel cost delta when ≥ 10%', () => {
    const logs: FuelLog[] = [
      { id: 'F1', vehicleId: 'V-1', date: '2026-05-10', liters: 50, costPerLiter: 2, totalCost: 100, odometer: 11000 },
      { id: 'F2', vehicleId: 'V-1', date: '2026-04-10', liters: 25, costPerLiter: 2, totalCost: 50, odometer: 10500 },
    ]
    const result = deriveFleetInsights([vehicle({})], [], logs, NOW)
    expect(result.find((i) => i.id === 'fleet:fuel-delta')?.metric).toMatch(/\+\d+%/)
  })

  it('skips fuel delta when prior month is zero', () => {
    const logs: FuelLog[] = [
      { id: 'F1', vehicleId: 'V-1', date: '2026-05-10', liters: 50, costPerLiter: 2, totalCost: 100, odometer: 11000 },
    ]
    const result = deriveFleetInsights([vehicle({})], [], logs, NOW)
    expect(result.find((i) => i.id === 'fleet:fuel-delta')).toBeUndefined()
  })

  it('reports most-active vehicle by trip count this month', () => {
    const trips: Trip[] = [
      { id: 'T1', vehicleId: 'V-1', driverId: 'D1', status: 'completed', startTime: '2026-05-01T00:00:00Z', endTime: '2026-05-01T01:00:00Z', startOdometer: 1, endOdometer: 10, distance: 9 },
      { id: 'T2', vehicleId: 'V-1', driverId: 'D1', status: 'completed', startTime: '2026-05-02T00:00:00Z', endTime: '2026-05-02T01:00:00Z', startOdometer: 10, endOdometer: 20, distance: 10 },
    ]
    const result = deriveFleetInsights([vehicle({ id: 'V-1', plateNumber: 'XYZ-9' })], trips, [], NOW)
    expect(result.find((i) => i.id === 'fleet:top-vehicle')?.message).toContain('XYZ-9')
  })
})

// Suppress unused-import lint for the helpers that round-trip dates only.
void subMonths
void format
