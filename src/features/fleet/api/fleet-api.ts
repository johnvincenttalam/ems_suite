import type { Vehicle, Trip, FuelLog, VehicleStatus, VehicleInspection, VehicleInspectionResult, VehicleAssignment } from '@/features/fleet/types'
import { mockVehicles, mockTrips, mockFuelLogs, mockVehicleInspections, mockVehicleAssignments } from '@/features/fleet/data/mock-fleet'
import { mockDrivers } from '@/features/drivers'
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

let tripCounter = mockTrips.reduce((max, t) => {
  const m = t.id.match(/^TR-\d{4}-(\d{4,})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextTripId(): string {
  tripCounter += 1
  return `TR-${new Date().getFullYear()}-${String(tripCounter).padStart(4, '0')}`
}

let fuelLogCounter = mockFuelLogs.reduce((max, f) => {
  const m = f.id.match(/^FL-\d{4}-(\d{4,})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextFuelLogId(): string {
  fuelLogCounter += 1
  return `FL-${new Date().getFullYear()}-${String(fuelLogCounter).padStart(4, '0')}`
}

let assignmentCounter = mockVehicleAssignments.reduce((max, a) => {
  const m = a.id.match(/^VA-\d{4}-(\d{4,})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextAssignmentId(): string {
  assignmentCounter += 1
  return `VA-${new Date().getFullYear()}-${String(assignmentCounter).padStart(4, '0')}`
}

let inspectionCounter = mockVehicleInspections.reduce((max, i) => {
  const m = i.id.match(/^VI-\d{4}-(\d{4,})$/)
  if (!m) return max
  const n = Number(m[1])
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextInspectionId(): string {
  inspectionCounter += 1
  return `VI-${new Date().getFullYear()}-${String(inspectionCounter).padStart(4, '0')}`
}

function findVehicle(id: string): Vehicle {
  const v = mockVehicles.find((x) => x.id === id)
  if (!v) throw new FleetValidationError(`Vehicle ${id} not found`)
  return v
}

function findTrip(id: string): Trip {
  const t = mockTrips.find((x) => x.id === id)
  if (!t) throw new FleetValidationError(`Trip ${id} not found`)
  return t
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
  checklistId?: string | null
  nextServiceDate?: string | null
  photoUrl?: string | null
  status?: VehicleStatus
  updatedBy: string
}

interface CreateTripInput {
  vehicleId: string
  driverId: string
  startOdometer: number
  purpose?: string
  startTime?: string
  createdBy: string
}

interface CompleteTripInput {
  endOdometer: number
  endTime?: string
  completedBy: string
}

interface CreateFuelLogInput {
  vehicleId: string
  driverId?: string
  date: string
  liters: number
  costPerLiter: number
  odometer: number
  station?: string
  notes?: string
  createdBy: string
}

interface AssignVehicleInput {
  vehicleId: string
  driverId: string
  notes?: string
  assignedByUserId: string
}

interface ReturnVehicleInput {
  vehicleId: string
  notes?: string
  returnedByUserId: string
}

interface CreateInspectionInput {
  vehicleId: string
  inspectorDriverId?: string
  date: string
  result: VehicleInspectionResult
  itemsTotal?: number
  itemsPassed?: number
  tripId?: string
  notes?: string
  createdBy: string
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

  listVehicleInspections: async (): Promise<VehicleInspection[]> => {
    await delay()
    return [...mockVehicleInspections].sort((a, b) => b.date.localeCompare(a.date))
  },

  listVehicleAssignments: async (): Promise<VehicleAssignment[]> => {
    await delay()
    return [...mockVehicleAssignments].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))
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

  createTrip: async (input: CreateTripInput): Promise<Trip> => {
    await delay(140)
    const vehicle = findVehicle(input.vehicleId)
    if (vehicle.status !== 'active') {
      throw new FleetValidationError(
        `Vehicle ${vehicle.plateNumber} is ${vehicle.status} — only active vehicles can start trips`,
      )
    }
    if (mockTrips.some((t) => t.vehicleId === input.vehicleId && t.status === 'in_progress')) {
      throw new FleetValidationError(`${vehicle.plateNumber} already has a trip in progress`)
    }
    const driver = mockDrivers.find((d) => d.id === input.driverId)
    if (!driver) throw new FleetValidationError(`Driver ${input.driverId} not found`)
    if (driver.status !== 'active') {
      throw new FleetValidationError(`${driver.name} is not active`)
    }
    if (input.startOdometer < vehicle.currentOdometer) {
      throw new FleetValidationError(
        `Starting odometer (${input.startOdometer.toLocaleString()}) is below the vehicle's current ${vehicle.currentOdometer.toLocaleString()}`,
      )
    }

    const trip: Trip = {
      id: nextTripId(),
      vehicleId: vehicle.id,
      driverId: driver.id,
      startTime: input.startTime ?? new Date().toISOString(),
      startOdometer: input.startOdometer,
      distance: 0,
      purpose: input.purpose,
      status: 'in_progress',
    }
    mockTrips.push(trip)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Fleet',
      detail: `Started trip ${trip.id} — ${vehicle.plateNumber} · ${driver.name}${trip.purpose ? ` · ${trip.purpose}` : ''}`,
    })
    return trip
  },

  completeTrip: async (id: string, input: CompleteTripInput): Promise<Trip> => {
    await delay(140)
    const trip = findTrip(id)
    if (trip.status !== 'in_progress') {
      throw new FleetValidationError(`Trip ${trip.id} is ${trip.status} — only in-progress trips can be completed`)
    }
    if (input.endOdometer < trip.startOdometer) {
      throw new FleetValidationError(
        `Ending odometer (${input.endOdometer.toLocaleString()}) is below the start ${trip.startOdometer.toLocaleString()}`,
      )
    }

    trip.endTime = input.endTime ?? new Date().toISOString()
    trip.endOdometer = input.endOdometer
    trip.distance = input.endOdometer - trip.startOdometer
    trip.status = 'completed'

    // Bump the vehicle's odometer forward (only — never backward).
    const vehicle = mockVehicles.find((v) => v.id === trip.vehicleId)
    if (vehicle && input.endOdometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = input.endOdometer
    }

    recordAudit({
      userId: input.completedBy,
      action: 'update',
      module: 'Fleet',
      detail: `Completed trip ${trip.id} — ${trip.distance.toLocaleString()} km`,
    })
    return trip
  },

  cancelTrip: async (id: string, byUserId: string, reason?: string): Promise<Trip> => {
    await delay(120)
    const trip = findTrip(id)
    if (trip.status !== 'in_progress') {
      throw new FleetValidationError(`Trip ${trip.id} is ${trip.status} — only in-progress trips can be cancelled`)
    }
    trip.status = 'cancelled'
    trip.distance = 0
    trip.endTime = undefined
    trip.endOdometer = undefined

    recordAudit({
      userId: byUserId,
      action: 'update',
      module: 'Fleet',
      detail: `Cancelled trip ${trip.id}${reason ? ` — ${reason}` : ''}`,
    })
    return trip
  },

  assignVehicle: async (input: AssignVehicleInput): Promise<{ vehicle: Vehicle; assignment: VehicleAssignment }> => {
    await delay(140)
    const vehicle = findVehicle(input.vehicleId)
    if (vehicle.status === 'retired') {
      throw new FleetValidationError(`Vehicle ${vehicle.plateNumber} is retired — cannot be assigned`)
    }
    if (vehicle.assignedDriverId) {
      throw new FleetValidationError(`Vehicle ${vehicle.plateNumber} is already assigned — return it first`)
    }
    const driver = mockDrivers.find((d) => d.id === input.driverId)
    if (!driver) throw new FleetValidationError(`Driver ${input.driverId} not found`)
    if (driver.status !== 'active') {
      throw new FleetValidationError(`${driver.name} is not active`)
    }

    vehicle.assignedDriverId = driver.id

    const assignment: VehicleAssignment = {
      id: nextAssignmentId(),
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedDate: new Date().toISOString().slice(0, 10),
      notes: input.notes,
      assignedByUserId: input.assignedByUserId,
    }
    mockVehicleAssignments.push(assignment)

    recordAudit({
      userId: input.assignedByUserId,
      action: 'update',
      module: 'Fleet',
      detail: `Assigned ${vehicle.plateNumber} to ${driver.name}${input.notes ? ` — ${input.notes}` : ''}`,
    })
    return { vehicle, assignment }
  },

  returnVehicle: async (input: ReturnVehicleInput): Promise<Vehicle> => {
    await delay(140)
    const vehicle = findVehicle(input.vehicleId)
    if (!vehicle.assignedDriverId) {
      throw new FleetValidationError(`Vehicle ${vehicle.plateNumber} is not currently assigned`)
    }
    const previousDriverId = vehicle.assignedDriverId

    // Close the open assignment record.
    const open = [...mockVehicleAssignments]
      .reverse()
      .find((a) => a.vehicleId === vehicle.id && !a.returnedDate)
    if (open) {
      open.returnedDate = new Date().toISOString().slice(0, 10)
      open.returnedByUserId = input.returnedByUserId
      if (input.notes) open.notes = open.notes ? `${open.notes} | ${input.notes}` : input.notes
    }
    vehicle.assignedDriverId = undefined

    const previousDriver = mockDrivers.find((d) => d.id === previousDriverId)
    recordAudit({
      userId: input.returnedByUserId,
      action: 'update',
      module: 'Fleet',
      detail: `Returned ${vehicle.plateNumber} from ${previousDriver?.name ?? previousDriverId}${input.notes ? ` — ${input.notes}` : ''}`,
    })
    return vehicle
  },

  createInspection: async (input: CreateInspectionInput): Promise<VehicleInspection> => {
    await delay(120)
    const vehicle = findVehicle(input.vehicleId)
    if (input.itemsTotal != null && input.itemsPassed != null && input.itemsPassed > input.itemsTotal) {
      throw new FleetValidationError('Items passed cannot exceed items total')
    }

    const inspection: VehicleInspection = {
      id: nextInspectionId(),
      vehicleId: vehicle.id,
      inspectorDriverId: input.inspectorDriverId,
      date: input.date,
      result: input.result,
      itemsTotal: input.itemsTotal,
      itemsPassed: input.itemsPassed,
      tripId: input.tripId,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    }
    mockVehicleInspections.push(inspection)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Fleet',
      detail: `Recorded inspection ${inspection.id} — ${vehicle.plateNumber} · ${inspection.result}`,
    })
    return inspection
  },

  createFuelLog: async (input: CreateFuelLogInput): Promise<FuelLog> => {
    await delay(140)
    const vehicle = findVehicle(input.vehicleId)
    if (vehicle.fuelType === 'electric') {
      throw new FleetValidationError(`${vehicle.plateNumber} is electric — fuel logs don't apply`)
    }
    if (input.liters <= 0) throw new FleetValidationError('Liters must be greater than 0')
    if (input.costPerLiter < 0) throw new FleetValidationError('Cost per liter cannot be negative')
    if (input.odometer < vehicle.currentOdometer) {
      throw new FleetValidationError(
        `Odometer (${input.odometer.toLocaleString()}) is below the vehicle's current ${vehicle.currentOdometer.toLocaleString()}`,
      )
    }
    if (input.driverId) {
      const driver = mockDrivers.find((d) => d.id === input.driverId)
      if (!driver) throw new FleetValidationError(`Driver ${input.driverId} not found`)
    }

    const log: FuelLog = {
      id: nextFuelLogId(),
      vehicleId: vehicle.id,
      driverId: input.driverId,
      date: input.date,
      liters: input.liters,
      costPerLiter: input.costPerLiter,
      totalCost: Number((input.liters * input.costPerLiter).toFixed(2)),
      odometer: input.odometer,
      station: input.station,
      notes: input.notes,
    }
    mockFuelLogs.push(log)

    if (input.odometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = input.odometer
    }

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Fleet',
      detail: `Logged fuel ${log.id} — ${vehicle.plateNumber} · ${log.liters} L${log.station ? ` @ ${log.station}` : ''}`,
    })
    return log
  },
}
