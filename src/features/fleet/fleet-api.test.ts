import { describe, it, expect, beforeEach } from 'vitest'
import { fleetApi, FleetValidationError } from './api/fleet-api'
import { mockDrivers } from '@/features/drivers'
import { mockAssets } from '@/features/assets'
import { mockVehicles, mockTrips, mockFuelLogs } from './data/mock-fleet'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'

describe('fleetApi.listVehicles', () => {
  it('returns at least one vehicle', async () => {
    const result = await fleetApi.listVehicles()
    expect(result.length).toBeGreaterThan(0)
  })

  it('plate numbers are unique', async () => {
    const result = await fleetApi.listVehicles()
    const plates = result.map((v) => v.plateNumber)
    expect(new Set(plates).size).toBe(plates.length)
  })

  it('every assignedDriverId, when present, references a known driver', async () => {
    const result = await fleetApi.listVehicles()
    const driverIds = new Set(mockDrivers.map((d) => d.id))
    expect(result.every((v) => !v.assignedDriverId || driverIds.has(v.assignedDriverId))).toBe(true)
  })

  it('every linkedAssetId, when present, references a known asset', async () => {
    const result = await fleetApi.listVehicles()
    const assetIds = new Set(mockAssets.map((a) => a.id))
    expect(result.every((v) => !v.linkedAssetId || assetIds.has(v.linkedAssetId))).toBe(true)
  })

  it('electric vehicles have fuelCapacityLiters of 0', async () => {
    const result = await fleetApi.listVehicles()
    const electric = result.filter((v) => v.fuelType === 'electric')
    expect(electric.every((v) => v.fuelCapacityLiters === 0)).toBe(true)
  })

  it('non-retired vehicles have a nextServiceDate so the dashboard can flag due services', async () => {
    const result = await fleetApi.listVehicles()
    const inService = result.filter((v) => v.status !== 'retired')
    expect(inService.length).toBeGreaterThan(0)
    expect(inService.every((v) => !!v.nextServiceDate)).toBe(true)
  })
})

describe('fleetApi.listTrips', () => {
  it('returns trips newest-first', async () => {
    const result = await fleetApi.listTrips()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].startTime >= result[i].startTime).toBe(true)
    }
  })

  it('every vehicleId references a known vehicle', async () => {
    const trips = await fleetApi.listTrips()
    const vehicles = await fleetApi.listVehicles()
    const ids = new Set(vehicles.map((v) => v.id))
    expect(trips.every((t) => ids.has(t.vehicleId))).toBe(true)
  })

  it('every driverId references a known driver', async () => {
    const trips = await fleetApi.listTrips()
    const driverIds = new Set(mockDrivers.map((d) => d.id))
    expect(trips.every((t) => driverIds.has(t.driverId))).toBe(true)
  })

  it('completed trips have endTime, endOdometer, and endOdometer >= startOdometer', async () => {
    const result = await fleetApi.listTrips()
    const done = result.filter((t) => t.status === 'completed')
    expect(done.length).toBeGreaterThan(0)
    expect(done.every((t) => !!t.endTime && t.endOdometer != null && t.endOdometer >= t.startOdometer)).toBe(true)
  })

  it('completed trips have distance equal to endOdometer - startOdometer', async () => {
    const result = await fleetApi.listTrips()
    const done = result.filter((t) => t.status === 'completed')
    for (const t of done) {
      expect(t.distance).toBe((t.endOdometer ?? 0) - t.startOdometer)
    }
  })

  it('in-progress trips do not have endTime', async () => {
    const result = await fleetApi.listTrips()
    expect(result.filter((t) => t.status === 'in_progress').every((t) => !t.endTime)).toBe(true)
  })

  it('cancelled trips have no endTime, no endOdometer, and zero distance', async () => {
    const result = await fleetApi.listTrips()
    const cancelled = result.filter((t) => t.status === 'cancelled')
    expect(cancelled.length).toBeGreaterThan(0)
    expect(cancelled.every((t) => !t.endTime && t.endOdometer == null && t.distance === 0)).toBe(true)
  })
})

describe('driver license data', () => {
  it('every driver carries a licenseExpiry', async () => {
    expect(mockDrivers.every((d) => !!d.licenseExpiry)).toBe(true)
  })
})

describe('fleetApi.createVehicle', () => {
  let originalLength: number
  beforeEach(() => {
    originalLength = mockVehicles.length
  })
  // The mock array is shared module state across the worker pool. Tests
  // append; clean up so other test files aren't polluted.
  function cleanup() {
    while (mockVehicles.length > originalLength) mockVehicles.pop()
  }

  it('creates a vehicle with status=active by default and emits an audit entry', async () => {
    const auditBefore = mockAuditLog.length
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'TEST 0001 X',
      model: 'Test Truck',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      createdBy: 'U001',
    })
    expect(vehicle.id).toMatch(/^V\d{3}$/)
    expect(vehicle.status).toBe('active')
    expect(vehicle.plateNumber).toBe('TEST 0001 X')
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    expect(mockAuditLog[0].module).toBe('Fleet')
    expect(mockAuditLog[0].action).toBe('create')
    cleanup()
  })

  it('rejects duplicate plates (case-insensitive)', async () => {
    await fleetApi.createVehicle({
      plateNumber: 'DUPE 1234 Z',
      model: 'A',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      createdBy: 'U001',
    })
    await expect(
      fleetApi.createVehicle({
        plateNumber: 'dupe 1234 z',
        model: 'B',
        year: 2026,
        fuelType: 'diesel',
        currentOdometer: 0,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(FleetValidationError)
    cleanup()
  })

  it('forces fuelCapacityLiters=0 for electric vehicles', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'EV TEST 1',
      model: 'Tesla Test',
      year: 2026,
      fuelType: 'electric',
      currentOdometer: 0,
      fuelCapacityLiters: 999, // explicitly try to set; should be ignored
      createdBy: 'U001',
    })
    expect(vehicle.fuelCapacityLiters).toBe(0)
    cleanup()
  })

  it('rejects out-of-range year and negative odometer', async () => {
    await expect(
      fleetApi.createVehicle({
        plateNumber: 'BAD YEAR',
        model: 'X',
        year: 1800,
        fuelType: 'diesel',
        currentOdometer: 0,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/Year is out of range/)

    await expect(
      fleetApi.createVehicle({
        plateNumber: 'NEG OD',
        model: 'X',
        year: 2026,
        fuelType: 'diesel',
        currentOdometer: -1,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/cannot be negative/)
    cleanup()
  })
})

describe('fleetApi.updateVehicle', () => {
  let originalLength: number
  beforeEach(() => {
    originalLength = mockVehicles.length
  })
  function cleanup() {
    while (mockVehicles.length > originalLength) mockVehicles.pop()
  }

  it('applies a partial patch and audits only when something changed', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'UPDATE 1',
      model: 'Old Model',
      year: 2024,
      fuelType: 'diesel',
      currentOdometer: 100,
      createdBy: 'U001',
    })
    const auditBefore = mockAuditLog.length
    const updated = await fleetApi.updateVehicle(vehicle.id, {
      model: 'New Model',
      currentOdometer: 200,
      updatedBy: 'U001',
    })
    expect(updated.model).toBe('New Model')
    expect(updated.currentOdometer).toBe(200)
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    expect(mockAuditLog[0].detail).toContain('model, currentOdometer')

    // No-op patch shouldn't audit.
    const auditBefore2 = mockAuditLog.length
    await fleetApi.updateVehicle(vehicle.id, { updatedBy: 'U001' })
    expect(mockAuditLog.length).toBe(auditBefore2)
    cleanup()
  })

  it('refuses to decrease the odometer (typo guard)', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'ODO GUARD',
      model: 'Test',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 50_000,
      createdBy: 'U001',
    })
    await expect(
      fleetApi.updateVehicle(vehicle.id, { currentOdometer: 49_999, updatedBy: 'U001' }),
    ).rejects.toThrow(/Odometer can't decrease/)
    cleanup()
  })

  it('clears nullable fields when patch passes null', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'CLEAR FIELDS',
      model: 'Test',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      assignedDriverId: 'DRV-002',
      linkedAssetId: 'AST-001',
      createdBy: 'U001',
    })
    const updated = await fleetApi.updateVehicle(vehicle.id, {
      assignedDriverId: null,
      linkedAssetId: null,
      updatedBy: 'U001',
    })
    expect(updated.assignedDriverId).toBeUndefined()
    expect(updated.linkedAssetId).toBeUndefined()
    cleanup()
  })

  it('refuses to re-activate a retired vehicle through edit', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'RETIRED EDIT',
      model: 'Test',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      createdBy: 'U001',
    })
    await fleetApi.retireVehicle(vehicle.id, 'U001')
    await expect(
      fleetApi.updateVehicle(vehicle.id, { status: 'active', updatedBy: 'U001' }),
    ).rejects.toThrow(/cannot be re-activated/i)
    cleanup()
  })

  it('refuses duplicate plates on rename', async () => {
    const v1 = await fleetApi.createVehicle({
      plateNumber: 'PLATE A',
      model: 'A',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      createdBy: 'U001',
    })
    await fleetApi.createVehicle({
      plateNumber: 'PLATE B',
      model: 'B',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      createdBy: 'U001',
    })
    await expect(
      fleetApi.updateVehicle(v1.id, { plateNumber: 'PLATE B', updatedBy: 'U001' }),
    ).rejects.toThrow(/already registered/i)
    cleanup()
  })
})

describe('fleetApi.retireVehicle', () => {
  let originalLength: number
  beforeEach(() => {
    originalLength = mockVehicles.length
  })
  function cleanup() {
    while (mockVehicles.length > originalLength) mockVehicles.pop()
  }

  it('flips status to retired, clears assigned driver, and audits', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'RETIRE TEST',
      model: 'Test',
      year: 2020,
      fuelType: 'diesel',
      currentOdometer: 200_000,
      assignedDriverId: 'DRV-002',
      createdBy: 'U001',
    })
    const auditBefore = mockAuditLog.length
    const retired = await fleetApi.retireVehicle(vehicle.id, 'U001', 'End of useful life')
    expect(retired.status).toBe('retired')
    expect(retired.assignedDriverId).toBeUndefined()
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    expect(mockAuditLog[0].detail).toContain('End of useful life')
    cleanup()
  })

  it('refuses to retire an already-retired vehicle', async () => {
    const vehicle = await fleetApi.createVehicle({
      plateNumber: 'DOUBLE RETIRE',
      model: 'Test',
      year: 2026,
      fuelType: 'diesel',
      currentOdometer: 0,
      createdBy: 'U001',
    })
    await fleetApi.retireVehicle(vehicle.id, 'U001')
    await expect(fleetApi.retireVehicle(vehicle.id, 'U001')).rejects.toThrow(/already retired/i)
    cleanup()
  })
})

describe('fleetApi.listFuelLogs', () => {
  it('returns logs newest-first', async () => {
    const result = await fleetApi.listFuelLogs()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].date >= result[i].date).toBe(true)
    }
  })

  it('every vehicleId references a known vehicle', async () => {
    const logs = await fleetApi.listFuelLogs()
    const vehicles = await fleetApi.listVehicles()
    const ids = new Set(vehicles.map((v) => v.id))
    expect(logs.every((l) => ids.has(l.vehicleId))).toBe(true)
  })

  it('totalCost equals liters × costPerLiter (within rounding)', async () => {
    const logs = await fleetApi.listFuelLogs()
    for (const l of logs) {
      const expected = l.liters * l.costPerLiter
      expect(Math.abs(l.totalCost - expected)).toBeLessThan(0.05)
    }
  })
})

describe('fleetApi.createTrip', () => {
  let originalLength: number
  let originalOdo: Map<string, number>
  beforeEach(() => {
    originalLength = mockTrips.length
    originalOdo = new Map(mockVehicles.map((v) => [v.id, v.currentOdometer]))
  })
  function cleanup() {
    while (mockTrips.length > originalLength) mockTrips.pop()
    for (const v of mockVehicles) {
      const orig = originalOdo.get(v.id)
      if (orig !== undefined) v.currentOdometer = orig
    }
  }

  it('creates an in-progress trip and emits a Fleet audit entry', async () => {
    const vehicle = mockVehicles.find(
      (v) => v.status === 'active' && !mockTrips.some((t) => t.vehicleId === v.id && t.status === 'in_progress'),
    )!
    const driver = mockDrivers.find((d) => d.status === 'active')!
    const auditBefore = mockAuditLog.length

    const trip = await fleetApi.createTrip({
      vehicleId: vehicle.id,
      driverId: driver.id,
      startOdometer: vehicle.currentOdometer,
      purpose: 'API smoke test',
      createdBy: 'U001',
    })

    expect(trip.id).toMatch(/^TR-\d{4}-\d{4,}$/)
    expect(trip.status).toBe('in_progress')
    expect(trip.distance).toBe(0)
    expect(trip.endTime).toBeUndefined()
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    expect(mockAuditLog[0].module).toBe('Fleet')
    cleanup()
  })

  it('refuses a trip on a vehicle that already has an in-progress trip', async () => {
    const inProgress = mockTrips.find((t) => t.status === 'in_progress')!
    const driver = mockDrivers.find((d) => d.status === 'active')!
    await expect(
      fleetApi.createTrip({
        vehicleId: inProgress.vehicleId,
        driverId: driver.id,
        startOdometer: 99999,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/already has a trip in progress/i)
  })

  it('refuses a trip on a non-active vehicle', async () => {
    const retired = mockVehicles.find((v) => v.status === 'retired')!
    const driver = mockDrivers.find((d) => d.status === 'active')!
    await expect(
      fleetApi.createTrip({
        vehicleId: retired.id,
        driverId: driver.id,
        startOdometer: retired.currentOdometer,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/only active vehicles/i)
  })

  it('refuses a starting odometer below the vehicle current', async () => {
    const vehicle = mockVehicles.find((v) => v.status === 'active' && !mockTrips.some((t) => t.vehicleId === v.id && t.status === 'in_progress'))!
    const driver = mockDrivers.find((d) => d.status === 'active')!
    await expect(
      fleetApi.createTrip({
        vehicleId: vehicle.id,
        driverId: driver.id,
        startOdometer: vehicle.currentOdometer - 10,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/below the vehicle's current/i)
  })
})

describe('fleetApi.completeTrip', () => {
  it('sets endTime, endOdometer, distance, and bumps vehicle odometer', async () => {
    const vehicle = mockVehicles.find((v) => v.status === 'active' && !mockTrips.some((t) => t.vehicleId === v.id && t.status === 'in_progress'))!
    const driver = mockDrivers.find((d) => d.status === 'active')!
    const startOdo = vehicle.currentOdometer
    const trip = await fleetApi.createTrip({
      vehicleId: vehicle.id,
      driverId: driver.id,
      startOdometer: startOdo,
      createdBy: 'U001',
    })

    const completed = await fleetApi.completeTrip(trip.id, {
      endOdometer: startOdo + 200,
      completedBy: 'U001',
    })
    expect(completed.status).toBe('completed')
    expect(completed.distance).toBe(200)
    expect(completed.endOdometer).toBe(startOdo + 200)
    expect(vehicle.currentOdometer).toBe(startOdo + 200)

    // cleanup
    mockTrips.splice(mockTrips.indexOf(trip), 1)
    vehicle.currentOdometer = startOdo
  })

  it('refuses an end odometer below the start', async () => {
    const inProgress = mockTrips.find((t) => t.status === 'in_progress')!
    await expect(
      fleetApi.completeTrip(inProgress.id, {
        endOdometer: inProgress.startOdometer - 1,
        completedBy: 'U001',
      }),
    ).rejects.toThrow(/below the start/i)
  })

  it('refuses to complete an already-completed trip', async () => {
    const done = mockTrips.find((t) => t.status === 'completed')!
    await expect(
      fleetApi.completeTrip(done.id, { endOdometer: 999_999, completedBy: 'U001' }),
    ).rejects.toThrow(/only in-progress trips/i)
  })
})

describe('fleetApi.cancelTrip', () => {
  it('cancels an in-progress trip and clears end fields', async () => {
    const vehicle = mockVehicles.find((v) => v.status === 'active' && !mockTrips.some((t) => t.vehicleId === v.id && t.status === 'in_progress'))!
    const driver = mockDrivers.find((d) => d.status === 'active')!
    const trip = await fleetApi.createTrip({
      vehicleId: vehicle.id,
      driverId: driver.id,
      startOdometer: vehicle.currentOdometer,
      createdBy: 'U001',
    })

    const cancelled = await fleetApi.cancelTrip(trip.id, 'U001', 'dispatcher cancelled')
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.endTime).toBeUndefined()
    expect(cancelled.endOdometer).toBeUndefined()
    expect(cancelled.distance).toBe(0)

    mockTrips.splice(mockTrips.indexOf(trip), 1)
  })
})

describe('fleetApi.createFuelLog', () => {
  let originalLength: number
  let originalOdo: Map<string, number>
  beforeEach(() => {
    originalLength = mockFuelLogs.length
    originalOdo = new Map(mockVehicles.map((v) => [v.id, v.currentOdometer]))
  })
  function cleanup() {
    while (mockFuelLogs.length > originalLength) mockFuelLogs.pop()
    for (const v of mockVehicles) {
      const orig = originalOdo.get(v.id)
      if (orig !== undefined) v.currentOdometer = orig
    }
  }

  it('creates a fuel log, computes totalCost, and bumps vehicle odometer', async () => {
    const vehicle = mockVehicles.find((v) => v.fuelType !== 'electric' && v.status === 'active')!
    const startOdo = vehicle.currentOdometer
    const log = await fleetApi.createFuelLog({
      vehicleId: vehicle.id,
      date: '2026-05-01',
      liters: 50,
      costPerLiter: 2.5,
      odometer: startOdo + 100,
      createdBy: 'U001',
    })
    expect(log.id).toMatch(/^FL-\d{4}-\d{4,}$/)
    expect(log.totalCost).toBe(125)
    expect(vehicle.currentOdometer).toBe(startOdo + 100)
    cleanup()
  })

  it('refuses fuel logs on electric vehicles', async () => {
    const ev = mockVehicles.find((v) => v.fuelType === 'electric')!
    await expect(
      fleetApi.createFuelLog({
        vehicleId: ev.id,
        date: '2026-05-01',
        liters: 50,
        costPerLiter: 2.5,
        odometer: ev.currentOdometer + 100,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/electric/i)
  })

  it('refuses an odometer below the vehicle current', async () => {
    const vehicle = mockVehicles.find((v) => v.fuelType !== 'electric' && v.status === 'active')!
    await expect(
      fleetApi.createFuelLog({
        vehicleId: vehicle.id,
        date: '2026-05-01',
        liters: 50,
        costPerLiter: 2.5,
        odometer: vehicle.currentOdometer - 1,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/below the vehicle's current/i)
  })

  it('refuses zero or negative liters', async () => {
    const vehicle = mockVehicles.find((v) => v.fuelType !== 'electric' && v.status === 'active')!
    await expect(
      fleetApi.createFuelLog({
        vehicleId: vehicle.id,
        date: '2026-05-01',
        liters: 0,
        costPerLiter: 2.5,
        odometer: vehicle.currentOdometer + 1,
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/greater than 0/i)
  })
})
