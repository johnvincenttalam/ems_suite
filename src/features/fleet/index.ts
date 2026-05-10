export { VehiclesPage } from './pages/vehicles-page'
export { TripsPage } from './pages/trips-page'
export { FuelLogsPage } from './pages/fuel-logs-page'
export { FleetMaintenancePage } from './pages/fleet-maintenance-page'
export { FleetDashboard } from './pages/fleet-dashboard'
export { FleetAlertsPage } from './pages/fleet-alerts-page'
export { FleetLogsPage } from './pages/fleet-logs-page'
export { FleetUsersPage } from './pages/fleet-users-page'
export { FleetSettingsPage } from './pages/fleet-settings-page'
export { FleetReportsPage } from './pages/fleet-reports-page'
export { FleetInspectionsPage } from './pages/fleet-inspections-page'
export { FleetAssignmentsPage } from './pages/fleet-assignments-page'
export { FleetTrackingMapPage } from './pages/fleet-tracking-map-page'
export { FleetTrackingGpsPage } from './pages/fleet-tracking-gps-page'
export { FleetTrackingTagsPage } from './pages/fleet-tracking-tags-page'
export { FleetTrackingScansPage } from './pages/fleet-tracking-scans-page'
export { VehicleThumbnail } from './components/vehicle-thumbnail'
export {
  useVehicles,
  useTrips,
  useFuelLogs,
  useVehicleInspections,
  useVehicleAssignments,
  useCreateVehicle,
  useUpdateVehicle,
  useRetireVehicle,
  useCreateTrip,
  useCompleteTrip,
  useCancelTrip,
  useCreateFuelLog,
  useCreateVehicleInspection,
  useAssignVehicle,
  useReturnVehicle,
} from './hooks/use-fleet'
export { fleetApi, FleetValidationError } from './api/fleet-api'
export { mockVehicles, mockTrips, mockFuelLogs, mockVehicleInspections, mockVehicleAssignments } from './data/mock-fleet'
export type { Vehicle, Trip, FuelLog, VehicleStatus, FuelType, TripStatus, VehicleInspection, VehicleInspectionResult, VehicleAssignment } from './types'
