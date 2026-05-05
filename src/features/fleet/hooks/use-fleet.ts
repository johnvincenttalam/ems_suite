import { useQuery } from '@tanstack/react-query'
import { fleetApi } from '@/features/fleet/api/fleet-api'

export function useVehicles() {
  return useQuery({ queryKey: ['fleet', 'vehicles'], queryFn: fleetApi.listVehicles })
}

export function useTrips() {
  return useQuery({ queryKey: ['fleet', 'trips'], queryFn: fleetApi.listTrips })
}

export function useFuelLogs() {
  return useQuery({ queryKey: ['fleet', 'fuel-logs'], queryFn: fleetApi.listFuelLogs })
}
