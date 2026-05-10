import type { Vehicle, Trip, FuelLog, VehicleStatus } from '@/features/fleet/types'
import { mockVehicles, mockTrips, mockFuelLogs } from '@/features/fleet/data/mock-fleet'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

let vehicleCounter = mockVehicles.reduce((max, v) => {
  const m = v.id.match(/^V(\d{3,})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextVehicleId(): string {
  vehicleCounter += 1
  return `V${String(vehicleCounter).padStart(3, '0')}`
}

function findVehicle(id: string): Vehicle {
  const v = mockVehicles.find((x) => x.id === id)
  if (!v) throw new FleetValidationError(`Vehicle ${id} not found`)
  return v
}

export class FleetValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FleetValidationError'
  }
}

interface CreateVehicleInput {
  plateNumber: string
  model: string
  year: number
  fuelType: Vehicle['fuelType']
  currentOdometer: number
  fuelCapacityLiters?: number
  assignedDriverId?: string
  linkedAssetId?: string
  checklistId?: string
  nextServiceDate?: string
  photoUrl?: string
  status?: VehicleStatus
  createdBy: string
}

interface UpdateVehicleInput {
  plateNumber?: string
  model?: string
  year?: number
  fuelType?: Vehicle['fuelType']
  currentOdometer?: number
  fuelCapacityLiters?: number
  assignedDriverId?: string | null
  linkedAssetId?: string | null
  checklistId?: string | null
  nextServiceDate?: string | null
  photoUrl?: string | null
  status?: VehicleStatus
  updatedBy: string
}

/**
 * Fleet API — swap with real HTTP when backend is ready:
 *   listVehicles:    () => http.get<Vehicle[]>('/fleet/vehicles')
 *   listTrips:       () => http.get<Trip[]>('/fleet/trips')
 *   listFuelLogs:    () => http.get<FuelLog[]>('/fleet/fuel-logs')
 *   createVehicle:   (body) => http.post<Vehicle>('/fleet/vehicles', body)
 *   updateVehicle:   (id, body) => http.patch<Vehicle>(`/fleet/vehicles/${id}`, body)
 *   retireVehicle:   (id, body) => http.post<Vehicle>(`/fleet/vehicles/${id}/retire`, body)
 */
export const fleetApi = {
  listVehicles: async (): Promise<Vehicle[]> => {
    await delay()
    return mockVehicles
  },
  listTrips: async (): Promise<Trip[]> => {
    await delay()
    return [...mockTrips].sort((a, b) => b.startTime.localeCompare(a.startTime))
  },
  listFuelLogs: async (): Promise<FuelLog[]> => {
    await delay()
    return [...mockFuelLogs].sort((a, b) => b.date.localeCompare(a.date))
  },

  createVehicle: async (input: CreateVehicleInput): Promise<Vehicle> => {
    await delay(160)
    const plate = input.plateNumber.trim()
    if (plate.length < 2) throw new FleetValidationError('Plate number is required')
    if (mockVehicles.some((v) => v.plateNumber.trim().toLowerCase() === plate.toLowerCase())) {
      throw new FleetValidationError(`Plate "${plate}" is already registered`)
    }
    if (input.year < 1990 || input.year > 2100) {
      throw new FleetValidationError('Year is out of range')
    }
    if (input.currentOdometer < 0) {
      throw new FleetValidationError('Odometer cannot be negative')
    }

    const vehicle: Vehicle = {
      id: nextVehicleId(),
      plateNumber: plate,
      model: input.model.trim(),
      year: input.year,
      status: input.status ?? 'active',
      fuelType: input.fuelType,
      currentOdometer: input.currentOdometer,
      fuelCapacityLiters: input.fuelType === 'electric' ? 0 : input.fuelCapacityLiters,
      assignedDriverId: input.assignedDriverId || undefined,
      linkedAssetId: input.linkedAssetId || undefined,
      checklistId: input.checklistId || undefined,
      nextServiceDate: input.nextServiceDate || undefined,
      photoUrl: input.photoUrl || undefined,
      createdAt: new Date().toISOString(),
    }
    mockVehicles.push(vehicle)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Fleet',
      detail: `Registered vehicle ${vehicle.plateNumber} (${vehicle.id}) — ${vehicle.model} ${vehicle.year}`,
    })
    return vehicle
  },

  updateVehicle: async (id: string, input: UpdateVehicleInput): Promise<Vehicle> => {
    await delay(120)
    const vehicle = findVehicle(id)
    const { updatedBy, ...patch } = input

    if (patch.plateNumber !== undefined) {
      const plate = patch.plateNumber.trim()
      if (plate.length < 2) throw new FleetValidationError('Plate number is required')
      if (
        mockVehicles.some(
          (v) => v.id !== vehicle.id && v.plateNumber.trim().toLowerCase() === plate.toLowerCase(),
        )
      ) {
        throw new FleetValidationError(`Plate "${plate}" is already registered`)
      }
      patch.plateNumber = plate
    }
    if (patch.year !== undefined && (patch.year < 1990 || patch.year > 2100)) {
      throw new FleetValidationError('Year is out of range')
    }
    if (patch.currentOdometer !== undefined && patch.currentOdometer < vehicle.currentOdometer) {
      // Odometers don't go backwards in real life — guard against typos.
      throw new FleetValidationError(
        `Odometer can't decrease (current ${vehicle.currentOdometer.toLocaleString()})`,
      )
    }
    if (vehicle.status === 'retired' && patch.status && patch.status !== 'retired') {
      throw new FleetValidationError('Retired vehicles cannot be re-activated through edit — register a new vehicle.')
    }

    const changes: string[] = []
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue
      const k = key as keyof Vehicle
      const before = vehicle[k]
      const next = value === null ? undefined : value
      if (before !== next) {
        changes.push(key)
        // The discriminated union of possible value types makes a strict
        // assignment painful; we trust the input shape (zod-validated at the
        // form layer) and apply via an unknown-cast rather than per-field code.
        ;(vehicle as unknown as Record<string, unknown>)[key] = next
      }
    }

    // Electric vehicles always have fuelCapacity 0 — enforce here so callers
    // don't have to remember.
    if (vehicle.fuelType === 'electric') vehicle.fuelCapacityLiters = 0

    if (changes.length === 0) return vehicle

    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Fleet',
      detail: `Updated vehicle ${vehicle.plateNumber} (${vehicle.id}) — changed ${changes.join(', ')}`,
    })
    return vehicle
  },

  retireVehicle: async (id: string, byUserId: string, reason?: string): Promise<Vehicle> => {
    await delay(120)
    const vehicle = findVehicle(id)
    if (vehicle.status === 'retired') {
      throw new FleetValidationError('Vehicle is already retired')
    }
    vehicle.status = 'retired'
    vehicle.assignedDriverId = undefined

    recordAudit({
      userId: byUserId,
      action: 'update',
      module: 'Fleet',
      detail: `Retired vehicle ${vehicle.plateNumber} (${vehicle.id})${reason ? ` — ${reason}` : ''}`,
    })
    return vehicle
  },
}
