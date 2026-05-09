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
export {
  useVehicles,
  useTrips,
  useFuelLogs,
  useCreateVehicle,
  useUpdateVehicle,
  useRetireVehicle,
} from './hooks/use-fleet'
export { fleetApi, FleetValidationError } from './api/fleet-api'
export { mockVehicles, mockTrips, mockFuelLogs } from './data/mock-fleet'
export type { Vehicle, Trip, FuelLog, VehicleStatus, FuelType, TripStatus } from './types'
