import type { FeatureKey } from './features'

/**
 * One module import per feature, shared between:
 *  - `app/routes.tsx` — wraps each in `React.lazy` for route-level code splitting
 *  - `shared/layout/sidebar.tsx` — warms the chunk cache on link hover
 *
 * Dynamic `import()` is idempotent — calling it more than once returns the
 * same cached promise, so hovering then clicking doesn't re-download.
 */
export const featureImports: Record<FeatureKey, () => Promise<unknown>> = {
  dashboard:   () => import('@/features/dashboard'),
  charts:      () => import('@/features/charts'),
  table:       () => import('@/features/orders'),
  forms:       () => import('@/features/forms'),
  inventory:           () => import('@/features/inventory'),
  inventoryMovements:  () => import('@/features/inventory'),
  inventoryStockInOut: () => import('@/features/inventory'),
  inventoryTransfers:  () => import('@/features/inventory'),
  inventoryAdjustments:() => import('@/features/inventory'),
  inventoryCycleCount: () => import('@/features/inventory'),
  inventoryDashboard:  () => import('@/features/inventory'),
  inventoryAlerts:     () => import('@/features/inventory'),
  inventoryLogs:       () => import('@/features/inventory'),
  inventoryUsers:      () => import('@/features/inventory'),
  inventorySettings:   () => import('@/features/inventory'),
  inventoryReports:    () => import('@/features/inventory'),
  assets:              () => import('@/features/assets'),
  assetAssignments:    () => import('@/features/assets'),
  assetMaintenance:    () => import('@/features/assets'),
  assetInspections:    () => import('@/features/assets'),
  assetDisposal:       () => import('@/features/assets'),
  assetsDashboard:     () => import('@/features/assets'),
  assetsAlerts:        () => import('@/features/assets'),
  assetsLogs:          () => import('@/features/assets'),
  assetsUsers:         () => import('@/features/assets'),
  assetsSettings:      () => import('@/features/assets'),
  assetsReports:       () => import('@/features/assets'),
  procurement:         () => import('@/features/procurement'),
  procurementApprovals:() => import('@/features/procurement'),
  procurementReports:  () => import('@/features/procurement'),
  procurementDashboard:() => import('@/features/procurement'),
  procurementAlerts:   () => import('@/features/procurement'),
  procurementLogs:     () => import('@/features/procurement'),
  procurementUsers:    () => import('@/features/procurement'),
  procurementSettings: () => import('@/features/procurement'),
  maintenance:           () => import('@/features/maintenance'),
  maintenanceSchedule:   () => import('@/features/maintenance'),
  maintenanceTechnicians:() => import('@/features/maintenance'),
  maintenanceDashboard:  () => import('@/features/maintenance'),
  maintenanceAlerts:     () => import('@/features/maintenance'),
  maintenanceLogs:       () => import('@/features/maintenance'),
  maintenanceUsers:      () => import('@/features/maintenance'),
  maintenanceSettings:   () => import('@/features/maintenance'),
  maintenanceReports:    () => import('@/features/maintenance'),
  documents:         () => import('@/features/documents'),
  documentsInbox:    () => import('@/features/documents'),
  documentsWorkflow: () => import('@/features/documents'),
  documentsCalendar: () => import('@/features/documents'),
  documentsReports:  () => import('@/features/documents'),
  documentsArchive:  () => import('@/features/documents'),
  sdmsDashboard:       () => import('@/features/documents'),
  sdmsAlerts:          () => import('@/features/documents'),
  sdmsLogs:            () => import('@/features/documents'),
  sdmsUsers:           () => import('@/features/documents'),
  sdmsSettings:        () => import('@/features/documents'),
  sdmsMyTasks:         () => import('@/features/documents'),
  sdmsCreateDocument:  () => import('@/features/documents'),
  sdmsDocumentViewer:  () => import('@/features/documents'),
  sdmsWorkflowTemplates:() => import('@/features/documents'),
  fleet:            () => import('@/features/fleet'),
  fleetTrips:       () => import('@/features/fleet'),
  fleetFuelLogs:    () => import('@/features/fleet'),
  fleetMaintenance: () => import('@/features/fleet'),
  fleetDashboard:   () => import('@/features/fleet'),
  fleetAlerts:      () => import('@/features/fleet'),
  fleetLogs:        () => import('@/features/fleet'),
  fleetUsers:       () => import('@/features/fleet'),
  fleetSettings:    () => import('@/features/fleet'),
  fleetReports:     () => import('@/features/fleet'),
  warehouses:  () => import('@/features/warehouses'),
  categories:  () => import('@/features/categories'),
  uom:         () => import('@/features/uom'),
  suppliers:   () => import('@/features/suppliers'),
  activity:    () => import('@/features/activity'),
  profile:     () => import('@/features/profile'),
  userProfile: () => import('@/features/users'),
  uiKit:       () => import('@/features/ui-kit'),
}

export function prefetchFeature(key: FeatureKey) {
  featureImports[key]().catch(() => {
    // Network / chunk load errors will surface on the real navigation;
    // prefetch is a best-effort warm-up and should never throw.
  })
}
