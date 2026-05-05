import { describe, it, expect } from 'vitest'
import { fleetApi } from './api/fleet-api'
import { mockUsers } from '@/features/users'
import { mockAssets } from '@/features/assets'

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

  it('every assignedDriverId, when present, references a known user', async () => {
    const result = await fleetApi.listVehicles()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((v) => !v.assignedDriverId || userIds.has(v.assignedDriverId))).toBe(true)
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

  it('every driverId references a known user', async () => {
    const trips = await fleetApi.listTrips()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(trips.every((t) => userIds.has(t.driverId))).toBe(true)
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
