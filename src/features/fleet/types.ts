export type VehicleStatus = 'active' | 'maintenance' | 'retired'
export type FuelType = 'petrol' | 'diesel' | 'electric'
export type TripStatus = 'in_progress' | 'completed' | 'cancelled'

export interface Vehicle {
  id: string
  plateNumber: string
  model: string
  year: number
  status: VehicleStatus
  fuelType: FuelType
  currentOdometer: number
  fuelCapacityLiters?: number
  assignedDriverId?: string
  linkedAssetId?: string
  /** Optional checklist template — used for pre-trip inspection. */
  checklistId?: string
  /** Next scheduled service date (ISO yyyy-mm-dd). Used by the dashboard's
   * "Maintenance Due" panel to flag vehicles approaching or past due. */
  nextServiceDate?: string
  createdAt: string
}

export interface Trip {
  id: string
  vehicleId: string
  driverId: string
  startTime: string
  endTime?: string
  startOdometer: number
  endOdometer?: number
  distance: number
  purpose?: string
  status: TripStatus
}

export interface FuelLog {
  id: string
  vehicleId: string
  driverId?: string
  date: string
  liters: number
  costPerLiter: number
  totalCost: number
  odometer: number
  station?: string
  notes?: string
}
