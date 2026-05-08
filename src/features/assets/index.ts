export { RegistryPage } from './pages/registry-page'
export { AssignmentsPage } from './pages/assignments-page'
export { AssetsDashboard } from './pages/assets-dashboard'
export { AssetsAlertsPage } from './pages/assets-alerts-page'
export { AssetsLogsPage } from './pages/assets-logs-page'
export { AssetsUsersPage } from './pages/assets-users-page'
export { AssetsSettingsPage } from './pages/assets-settings-page'
export { AssetsReportsPage } from './pages/assets-reports-page'
export {
  useAssets,
  useAssetAssignments,
  useAssetEvents,
  useAssetInspections,
} from './hooks/use-assets'
export { assetsApi } from './api/assets-api'
export {
  mockAssets,
  mockAssetAssignments,
  mockAssetEvents,
  mockInspections,
} from './data/mock-assets'
export type {
  Asset,
  AssetAssignment,
  AssetStatus,
  AssetCondition,
  AssetEvent,
  AssetEventType,
  DisposalType,
  Inspection,
  InspectionLine,
  InspectionResult,
  InspectionStatus,
} from './types'
