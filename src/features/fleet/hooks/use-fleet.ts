import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fleetApi } from '@/features/fleet/api/fleet-api'
import type { Vehicle, VehicleStatus } from '@/features/fleet/types'

export function useVehicles() {
  return useQuery({ queryKey: ['fleet', 'vehicles'], queryFn: fleetApi.listVehicles })
}

export function useTrips() {
  return useQuery({ queryKey: ['fleet', 'trips'], queryFn: fleetApi.listTrips })
}

export function useFuelLogs() {
  return useQuery({ queryKey: ['fleet', 'fuel-logs'], queryFn: fleetApi.listFuelLogs })
}

function invalidateFleet(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['fleet'] })
  qc.invalidateQueries({ queryKey: ['audit-log'] })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
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
      status?: VehicleStatus
      createdBy: string
    }) => fleetApi.createVehicle(input),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useUpdateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      patch: {
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
        status?: VehicleStatus
        updatedBy: string
      }
    }) => fleetApi.updateVehicle(input.id, input.patch),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useRetireVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; byUserId: string; reason?: string }) =>
      fleetApi.retireVehicle(input.id, input.byUserId, input.reason),
    onSuccess: () => invalidateFleet(qc),
  })
}
