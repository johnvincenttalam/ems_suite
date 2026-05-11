export { RegistryPage } from './pages/registry-page'
export { AssignmentsPage } from './pages/assignments-page'
export { AssetsMaintenancePage } from './pages/assets-maintenance-page'
export { AssetInspectionsPage } from './pages/asset-inspections-page'
export { AssetDisposalPage } from './pages/asset-disposal-page'
export { AssetsDashboard } from './pages/assets-dashboard'
export { AssetsAlertsPage } from './pages/assets-alerts-page'
export { AssetsLogsPage } from './pages/assets-logs-page'
export { AssetsUsersPage } from './pages/assets-users-page'
export { AssetsSettingsPage } from './pages/assets-settings-page'
export { AssetsReportsPage } from './pages/assets-reports-page'
export { AssetsTrackingMapPage } from './pages/assets-tracking-map-page'
export { AssetsTrackingTagsPage } from './pages/assets-tracking-tags-page'
export { AssetsTrackingScansPage } from './pages/assets-tracking-scans-page'
export {
  useAssets,
  useAssetAssignments,
  useAssignAsset,
  useReturnAsset,
  useAssetEvents,
  useAssetInspections,
} from './hooks/use-assets'
export { assetsApi } from './api/assets-api'
export { depreciationSummary, totalBookValue } from './lib/depreciation'
export type { DepreciationSummary } from './lib/depreciation'
export { DISPOSAL_TYPE_LABELS } from './lib/disposal-labels'
export { AssetThumbnail } from './components/asset-thumbnail'
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
