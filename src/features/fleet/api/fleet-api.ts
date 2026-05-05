import type { Vehicle, Trip, FuelLog } from '@/features/fleet/types'
import { mockVehicles, mockTrips, mockFuelLogs } from '@/features/fleet/data/mock-fleet'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * Fleet API — swap with real HTTP when backend is ready:
 *   listVehicles:  () => http.get<Vehicle[]>('/fleet/vehicles')
 *   listTrips:     () => http.get<Trip[]>('/fleet/trips')
 *   listFuelLogs:  () => http.get<FuelLog[]>('/fleet/fuel-logs')
 *   createVehicle: (body) => http.post<Vehicle>('/fleet/vehicles', body)
 *   startTrip:     (body) => http.post<Trip>('/fleet/trips', body)
 *   endTrip:       (id, body) => http.post<Trip>(`/fleet/trips/${id}/end`, body)
 *   logFuel:       (body) => http.post<FuelLog>('/fleet/fuel-logs', body)
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
}
