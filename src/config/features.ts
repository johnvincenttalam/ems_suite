export const features = {
  // EMS — Management Information System (executive overview)
  dashboard: true,

  // EMS — operational modules
  inventory: true,
  inventoryMovements: true,
  inventoryCycleCount: true,
  inventoryDashboard: true,
  inventoryAlerts: true,
  inventoryLogs: true,
  inventoryUsers: true,
  inventorySettings: true,
  inventoryReports: true,
  assets: true,
  assetAssignments: true,
  assetsDashboard: true,
  assetsAlerts: true,
  assetsLogs: true,
  assetsUsers: true,
  assetsSettings: true,
  assetsReports: true,
  procurement: true,
  procurementApprovals: true,
  procurementReports: true,
  procurementDashboard: true,
  procurementAlerts: true,
  procurementLogs: true,
  procurementUsers: true,
  procurementSettings: true,
  maintenance: true,
  maintenanceSchedule: true,
  maintenanceTechnicians: true,
  maintenanceDashboard: true,
  maintenanceAlerts: true,
  maintenanceLogs: true,
  maintenanceUsers: true,
  maintenanceSettings: true,
  maintenanceReports: true,
  documents: true,
  documentsInbox: true,
  documentsWorkflow: true,
  documentsCalendar: true,
  documentsReports: true,
  documentsArchive: true,
  sdmsDashboard: true,
  sdmsAlerts: true,
  sdmsLogs: true,
  sdmsUsers: true,
  sdmsSettings: true,
  sdmsMyTasks: true,
  sdmsCreateDocument: true,
  sdmsDocumentViewer: true,
  sdmsWorkflowTemplates: true,
  fleet: true,
  fleetTrips: true,
  fleetFuelLogs: true,
  fleetMaintenance: true,
  fleetDashboard: true,
  fleetAlerts: true,
  fleetLogs: true,
  fleetUsers: true,
  fleetSettings: true,
  fleetReports: true,

  // EMS — administration / master data
  warehouses: true,
  categories: true,
  uom: true,
  suppliers: true,

  // Account
  profile: true,

  // Template demo pages — disabled for EMS, code retained for reference
  charts: false,
  table: false,
  forms: false,
  activity: true,
  uiKit: false,
} as const

export type FeatureKey = keyof typeof features

export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key]
}
