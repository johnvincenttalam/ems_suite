import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fleetApi } from '@/features/fleet/api/fleet-api'
import type { Vehicle, VehicleStatus, VehicleInspectionResult } from '@/features/fleet/types'

export function useVehicles() {
  return useQuery({ queryKey: ['fleet', 'vehicles'], queryFn: fleetApi.listVehicles })
}

export function useTrips() {
  return useQuery({ queryKey: ['fleet', 'trips'], queryFn: fleetApi.listTrips })
}

export function useFuelLogs() {
  return useQuery({ queryKey: ['fleet', 'fuel-logs'], queryFn: fleetApi.listFuelLogs })
}

export function useVehicleInspections() {
  return useQuery({ queryKey: ['fleet', 'inspections'], queryFn: fleetApi.listVehicleInspections })
}

export function useVehicleAssignments() {
  return useQuery({ queryKey: ['fleet', 'assignments'], queryFn: fleetApi.listVehicleAssignments })
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
      checklistId?: string
      nextServiceDate?: string
      photoUrl?: string
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
        checklistId?: string | null
        nextServiceDate?: string | null
        photoUrl?: string | null
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

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      vehicleId: string
      driverId: string
      startOdometer: number
      purpose?: string
      startTime?: string
      createdBy: string
    }) => fleetApi.createTrip(input),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useCompleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; endOdometer: number; endTime?: string; completedBy: string }) =>
      fleetApi.completeTrip(input.id, {
        endOdometer: input.endOdometer,
        endTime: input.endTime,
        completedBy: input.completedBy,
      }),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useCancelTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; byUserId: string; reason?: string }) =>
      fleetApi.cancelTrip(input.id, input.byUserId, input.reason),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useAssignVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { vehicleId: string; driverId: string; notes?: string; assignedByUserId: string }) =>
      fleetApi.assignVehicle(input),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useReturnVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { vehicleId: string; notes?: string; returnedByUserId: string }) =>
      fleetApi.returnVehicle(input),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useCreateVehicleInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      vehicleId: string
      inspectorDriverId?: string
      date: string
      result: VehicleInspectionResult
      itemsTotal?: number
      itemsPassed?: number
      tripId?: string
      notes?: string
      createdBy: string
    }) => fleetApi.createInspection(input),
    onSuccess: () => invalidateFleet(qc),
  })
}

export function useCreateFuelLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      vehicleId: string
      driverId?: string
      date: string
      liters: number
      costPerLiter: number
      odometer: number
      station?: string
      notes?: string
      createdBy: string
    }) => fleetApi.createFuelLog(input),
    onSuccess: () => invalidateFleet(qc),
  })
}
