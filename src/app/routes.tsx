import { lazy, Suspense, type ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ModuleLayout } from '@/shared/layout/module-layout'
import { ProtectedRoute, LoginPage } from '@/features/auth'
import { ModuleSelectorPage } from '@/features/modules'
import { Spinner } from '@/shared/ui/spinner'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { isFeatureEnabled, type FeatureKey } from '@/config/features'
import { featureImports } from '@/config/feature-imports'
import { modules, type EmsModule } from '@/config/modules'

const featurePages: Record<FeatureKey, ComponentType> = {
  dashboard:           lazy(() => featureImports.dashboard().then((m: any) => ({ default: m.AdminDashboard }))),
  charts:              lazy(() => featureImports.charts().then((m: any) => ({ default: m.ChartsPage }))),
  table:               lazy(() => featureImports.table().then((m: any) => ({ default: m.AdvancedTablePage }))),
  forms:               lazy(() => featureImports.forms().then((m: any) => ({ default: m.FormsPage }))),
  inventory:           lazy(() => featureImports.inventory().then((m: any) => ({ default: m.ItemsPage }))),
  inventoryMovements:  lazy(() => featureImports.inventoryMovements().then((m: any) => ({ default: m.MovementsPage }))),
  inventoryStockInOut: lazy(() => featureImports.inventoryStockInOut().then((m: any) => ({ default: m.StockInOutPage }))),
  inventoryTransfers:  lazy(() => featureImports.inventoryTransfers().then((m: any) => ({ default: m.TransfersPage }))),
  inventoryAdjustments:lazy(() => featureImports.inventoryAdjustments().then((m: any) => ({ default: m.AdjustmentsPage }))),
  inventoryCycleCount: lazy(() => featureImports.inventoryCycleCount().then((m: any) => ({ default: m.CycleCountPage }))),
  inventoryDashboard:  lazy(() => featureImports.inventoryDashboard().then((m: any) => ({ default: m.InventoryDashboard }))),
  inventoryAlerts:     lazy(() => featureImports.inventoryAlerts().then((m: any) => ({ default: m.InventoryAlertsPage }))),
  inventoryLogs:       lazy(() => featureImports.inventoryLogs().then((m: any) => ({ default: m.InventoryLogsPage }))),
  inventoryUsers:      lazy(() => featureImports.inventoryUsers().then((m: any) => ({ default: m.InventoryUsersPage }))),
  inventorySettings:   lazy(() => featureImports.inventorySettings().then((m: any) => ({ default: m.InventorySettingsPage }))),
  inventoryReports:    lazy(() => featureImports.inventoryReports().then((m: any) => ({ default: m.InventoryReportsPage }))),
  assets:              lazy(() => featureImports.assets().then((m: any) => ({ default: m.RegistryPage }))),
  assetAssignments:    lazy(() => featureImports.assetAssignments().then((m: any) => ({ default: m.AssignmentsPage }))),
  assetMaintenance:    lazy(() => featureImports.assetMaintenance().then((m: any) => ({ default: m.AssetsMaintenancePage }))),
  assetInspections:    lazy(() => featureImports.assetInspections().then((m: any) => ({ default: m.AssetInspectionsPage }))),
  assetDisposal:       lazy(() => featureImports.assetDisposal().then((m: any) => ({ default: m.AssetDisposalPage }))),
  assetsDashboard:     lazy(() => featureImports.assetsDashboard().then((m: any) => ({ default: m.AssetsDashboard }))),
  assetsAlerts:        lazy(() => featureImports.assetsAlerts().then((m: any) => ({ default: m.AssetsAlertsPage }))),
  assetsLogs:          lazy(() => featureImports.assetsLogs().then((m: any) => ({ default: m.AssetsLogsPage }))),
  assetsUsers:         lazy(() => featureImports.assetsUsers().then((m: any) => ({ default: m.AssetsUsersPage }))),
  assetsSettings:      lazy(() => featureImports.assetsSettings().then((m: any) => ({ default: m.AssetsSettingsPage }))),
  assetsReports:       lazy(() => featureImports.assetsReports().then((m: any) => ({ default: m.AssetsReportsPage }))),
  procurement:         lazy(() => featureImports.procurement().then((m: any) => ({ default: m.RequestsPage }))),
  procurementApprovals:lazy(() => featureImports.procurementApprovals().then((m: any) => ({ default: m.ApprovalsPage }))),
  procurementReports:  lazy(() => featureImports.procurementReports().then((m: any) => ({ default: m.ProcurementReportsPage }))),
  procurementDashboard:lazy(() => featureImports.procurementDashboard().then((m: any) => ({ default: m.ProcurementDashboard }))),
  procurementAlerts:   lazy(() => featureImports.procurementAlerts().then((m: any) => ({ default: m.ProcurementAlertsPage }))),
  procurementLogs:     lazy(() => featureImports.procurementLogs().then((m: any) => ({ default: m.ProcurementLogsPage }))),
  procurementUsers:    lazy(() => featureImports.procurementUsers().then((m: any) => ({ default: m.ProcurementUsersPage }))),
  procurementSettings: lazy(() => featureImports.procurementSettings().then((m: any) => ({ default: m.ProcurementSettingsPage }))),
  maintenance:           lazy(() => featureImports.maintenance().then((m: any) => ({ default: m.WorkOrdersPage }))),
  maintenanceSchedule:   lazy(() => featureImports.maintenanceSchedule().then((m: any) => ({ default: m.SchedulePage }))),
  maintenanceTechnicians:lazy(() => featureImports.maintenanceTechnicians().then((m: any) => ({ default: m.TechniciansPage }))),
  maintenanceDashboard:  lazy(() => featureImports.maintenanceDashboard().then((m: any) => ({ default: m.MaintenanceDashboard }))),
  maintenanceAlerts:     lazy(() => featureImports.maintenanceAlerts().then((m: any) => ({ default: m.MaintenanceAlertsPage }))),
  maintenanceLogs:       lazy(() => featureImports.maintenanceLogs().then((m: any) => ({ default: m.MaintenanceLogsPage }))),
  maintenanceUsers:      lazy(() => featureImports.maintenanceUsers().then((m: any) => ({ default: m.MaintenanceUsersPage }))),
  maintenanceSettings:   lazy(() => featureImports.maintenanceSettings().then((m: any) => ({ default: m.MaintenanceSettingsPage }))),
  maintenanceReports:    lazy(() => featureImports.maintenanceReports().then((m: any) => ({ default: m.MaintenanceReportsPage }))),
  documents:           lazy(() => featureImports.documents().then((m: any) => ({ default: m.DocumentsPage }))),
  documentsInbox:      lazy(() => featureImports.documentsInbox().then((m: any) => ({ default: m.InboxPage }))),
  documentsWorkflow:   lazy(() => featureImports.documentsWorkflow().then((m: any) => ({ default: m.WorkflowPage }))),
  documentsCalendar:   lazy(() => featureImports.documentsCalendar().then((m: any) => ({ default: m.CalendarPage }))),
  documentsReports:    lazy(() => featureImports.documentsReports().then((m: any) => ({ default: m.SdmsReportsPage }))),
  documentsArchive:    lazy(() => featureImports.documentsArchive().then((m: any) => ({ default: m.ArchivePage }))),
  sdmsDashboard:       lazy(() => featureImports.sdmsDashboard().then((m: any) => ({ default: m.SdmsDashboard }))),
  sdmsAlerts:          lazy(() => featureImports.sdmsAlerts().then((m: any) => ({ default: m.SdmsAlertsPage }))),
  sdmsLogs:            lazy(() => featureImports.sdmsLogs().then((m: any) => ({ default: m.SdmsLogsPage }))),
  sdmsUsers:           lazy(() => featureImports.sdmsUsers().then((m: any) => ({ default: m.SdmsUsersPage }))),
  sdmsSettings:        lazy(() => featureImports.sdmsSettings().then((m: any) => ({ default: m.SdmsSettingsPage }))),
  sdmsMyTasks:         lazy(() => featureImports.sdmsMyTasks().then((m: any) => ({ default: m.SdmsMyTasksPage }))),
  sdmsCreateDocument:  lazy(() => featureImports.sdmsCreateDocument().then((m: any) => ({ default: m.SdmsCreateDocumentPage }))),
  sdmsDocumentViewer:  lazy(() => featureImports.sdmsDocumentViewer().then((m: any) => ({ default: m.SdmsDocumentViewerPage }))),
  sdmsWorkflowTemplates:lazy(() => featureImports.sdmsWorkflowTemplates().then((m: any) => ({ default: m.SdmsWorkflowTemplatesPage }))),
  sdmsStorage:         lazy(() => featureImports.sdmsStorage().then((m: any) => ({ default: m.SdmsStoragePage }))),
  sdmsSmartSearch:     lazy(() => featureImports.sdmsSmartSearch().then((m: any) => ({ default: m.SdmsSmartSearchPage }))),
  fleet:               lazy(() => featureImports.fleet().then((m: any) => ({ default: m.VehiclesPage }))),
  fleetTrips:          lazy(() => featureImports.fleetTrips().then((m: any) => ({ default: m.TripsPage }))),
  fleetFuelLogs:       lazy(() => featureImports.fleetFuelLogs().then((m: any) => ({ default: m.FuelLogsPage }))),
  fleetMaintenance:    lazy(() => featureImports.fleetMaintenance().then((m: any) => ({ default: m.FleetMaintenancePage }))),
  fleetDashboard:      lazy(() => featureImports.fleetDashboard().then((m: any) => ({ default: m.FleetDashboard }))),
  fleetAlerts:         lazy(() => featureImports.fleetAlerts().then((m: any) => ({ default: m.FleetAlertsPage }))),
  fleetLogs:           lazy(() => featureImports.fleetLogs().then((m: any) => ({ default: m.FleetLogsPage }))),
  fleetUsers:          lazy(() => featureImports.fleetUsers().then((m: any) => ({ default: m.FleetUsersPage }))),
  fleetSettings:       lazy(() => featureImports.fleetSettings().then((m: any) => ({ default: m.FleetSettingsPage }))),
  fleetReports:        lazy(() => featureImports.fleetReports().then((m: any) => ({ default: m.FleetReportsPage }))),
  fleetIssues:         lazy(() => featureImports.fleetIssues().then((m: any) => ({ default: m.FleetIssuesPage }))),
  fleetDrivers:        lazy(() => featureImports.fleetDrivers().then((m: any) => ({ default: m.DriversPage }))),
  fleetTrackingMap:    lazy(() => featureImports.fleetTrackingMap().then((m: any) => ({ default: m.FleetTrackingMapPage }))),
  fleetTrackingGps:    lazy(() => featureImports.fleetTrackingGps().then((m: any) => ({ default: m.FleetTrackingGpsPage }))),
  fleetTrackingTags:   lazy(() => featureImports.fleetTrackingTags().then((m: any) => ({ default: m.FleetTrackingTagsPage }))),
  fleetTrackingScans:  lazy(() => featureImports.fleetTrackingScans().then((m: any) => ({ default: m.FleetTrackingScansPage }))),
  assetsIssues:        lazy(() => featureImports.assetsIssues().then((m: any) => ({ default: m.AssetsIssuesPage }))),
  assetsTrackingMap:   lazy(() => featureImports.assetsTrackingMap().then((m: any) => ({ default: m.AssetsTrackingMapPage }))),
  assetsTrackingTags:  lazy(() => featureImports.assetsTrackingTags().then((m: any) => ({ default: m.AssetsTrackingTagsPage }))),
  assetsTrackingScans: lazy(() => featureImports.assetsTrackingScans().then((m: any) => ({ default: m.AssetsTrackingScansPage }))),
  warehouses:          lazy(() => featureImports.warehouses().then((m: any) => ({ default: m.WarehousesPage }))),
  categories:          lazy(() => featureImports.categories().then((m: any) => ({ default: m.CategoriesPage }))),
  uom:                 lazy(() => featureImports.uom().then((m: any) => ({ default: m.UomPage }))),
  suppliers:           lazy(() => featureImports.suppliers().then((m: any) => ({ default: m.SuppliersPage }))),
  activity:            lazy(() => featureImports.activity().then((m: any) => ({ default: m.ActivityPage }))),
  profile:             lazy(() => featureImports.profile().then((m: any) => ({ default: m.ProfilePage }))),
  userProfile:         lazy(() => featureImports.userProfile().then((m: any) => ({ default: m.UserProfilePage }))),
  uiKit:               lazy(() => featureImports.uiKit().then((m: any) => ({ default: m.UIKitPage }))),
}

const ProfilePage = featurePages.profile
const NotFoundPage = lazy(() => import('@/shared/pages/not-found').then((m) => ({ default: m.NotFoundPage })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" />
    </div>
  )
}

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function renderModuleChildRoutes(module: EmsModule) {
  const navRoutes = module.nav
    .flatMap((g) => g.items)
    .filter((i) => isFeatureEnabled(i.feature))
    .map((item) => {
      const Page = featurePages[item.feature]
      if (item.path === '') {
        return <Route key={`${module.key}-index`} index element={<Lazy><Page /></Lazy>} />
      }
      return <Route key={`${module.key}-${item.path}`} path={item.path} element={<Lazy><Page /></Lazy>} />
    })

  const redirectRoutes = (module.redirects ?? []).map((r) => (
    <Route
      key={`${module.key}-redirect-${r.from}`}
      path={r.from}
      element={<Navigate to={r.to} replace />}
    />
  ))

  return [...navRoutes, ...redirectRoutes]
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ModuleSelectorPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />

      {modules.map((m) => (
        <Route
          key={`${m.key}-login`}
          path={`/module/${m.key}/login`}
          element={<LoginPage module={m} />}
        />
      ))}

      {modules.map((m) => (
        <Route
          key={m.key}
          path={`/module/${m.key}`}
          element={
            <ProtectedRoute allowedRoles={['admin']} loginPath={`/module/${m.key}/login`} module={m}>
              <ModuleLayout module={m} />
            </ProtectedRoute>
          }
        >
          {renderModuleChildRoutes(m)}
          <Route path="profile" element={<Lazy><ProfilePage /></Lazy>} />
          <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
        </Route>
      ))}

      <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
    </Routes>
  )
}
