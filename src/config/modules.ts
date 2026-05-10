import {
  LayoutDashboard,
  FolderOpen,
  Boxes,
  Package,
  Truck,
  ShoppingCart,
  Wrench,
  ListChecks,
  Users,
  Warehouse,
  Tag,
  Ruler,
  ClipboardList,
  Settings,
  Activity,
  Calendar,
  ArrowLeftRight,
  ArrowDownUp,
  Edit3,
  UserCheck,
  Route as RouteIcon,
  Fuel,
  ClipboardCheck,
  Bell,
  Workflow,
  Trash2,
  Bookmark,
  Sparkles,
  AlertCircle,
  Radar,
  Map as MapIcon,
  Satellite,
  ScanLine,
  type LucideIcon,
} from 'lucide-react'
import type { FeatureKey } from './features'

export type ModuleKey =
  | 'mis'
  | 'sdms'
  | 'inventory'
  | 'assets'
  | 'fleet'
  | 'procurement'
  | 'maintenance'
  | 'tracking'

export interface ModuleNavItem {
  label: string
  /** Module-relative path. Empty string for the module index. */
  path: string
  icon: LucideIcon
  feature: FeatureKey
  /** Route exists, but the sidebar hides it. Useful for action pages reached from inside other pages. */
  hidden?: boolean
}

export interface ModuleNavGroup {
  title?: string
  items: ModuleNavItem[]
}

/**
 * Module-relative redirect. `to` may be either module-relative (`documents?status=draft`)
 * or an absolute path starting with `/` (`/module/sdms/documents`). Used to keep old
 * URLs working after the sidebar collapses.
 */
export interface ModuleRedirect {
  from: string
  to: string
}

export interface EmsModule {
  key: ModuleKey
  name: string
  shortName: string
  description: string
  icon: LucideIcon
  /** Tailwind class for the selector card icon color (e.g. `text-blue-600`). */
  iconColor: string
  /** Module-relative landing path. Empty string for the index route. */
  defaultPath: string
  nav: ModuleNavGroup[]
  redirects?: ModuleRedirect[]
}

export const modules: EmsModule[] = [
  {
    key: 'sdms',
    name: 'Smart Document Management System',
    shortName: 'SDMS',
    description: 'Document lifecycle, signatures, version control, and audit trails.',
    icon: FolderOpen,
    iconColor: 'text-violet-600',
    defaultPath: '',
    nav: [
      {
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'sdmsDashboard' },
          { label: 'My Tasks', path: 'my-tasks', icon: ListChecks, feature: 'sdmsMyTasks' },
          { label: 'Documents', path: 'documents', icon: FolderOpen, feature: 'documents' },
          { label: 'Smart Search', path: 'smart-search', icon: Sparkles, feature: 'sdmsSmartSearch' },
          { label: 'My Storage', path: 'storage', icon: Bookmark, feature: 'sdmsStorage' },
          { label: 'Reports', path: 'reports', icon: ClipboardCheck, feature: 'documentsReports' },
        ],
      },
      {
        title: 'Admin',
        items: [
          { label: 'Users', path: 'users', icon: Users, feature: 'sdmsUsers' },
          { label: 'Workflow', path: 'workflow-templates', icon: Workflow, feature: 'sdmsWorkflowTemplates' },
          { label: 'Settings', path: 'settings', icon: Settings, feature: 'sdmsSettings' },
        ],
      },
      {
        items: [
          { label: 'Create Document', path: 'create-document', icon: FolderOpen, feature: 'sdmsCreateDocument', hidden: true },
          { label: 'Document Viewer', path: 'documents/:id', icon: FolderOpen, feature: 'sdmsDocumentViewer', hidden: true },
          { label: 'User Profile', path: 'users/:id', icon: Users, feature: 'userProfile', hidden: true },
        ],
      },
    ],
    redirects: [
      { from: 'inbox', to: 'documents?status=draft' },
      { from: 'workflow', to: 'documents?status=in-review' },
      { from: 'archive', to: 'documents?status=archived' },
      { from: 'alerts', to: 'my-tasks' },
      { from: 'calendar', to: 'my-tasks' },
    ],
  },
  {
    key: 'inventory',
    name: 'Inventory Management System',
    shortName: 'Inventory',
    description: 'Item registry, stock movements, transfers, and cycle counting.',
    icon: Boxes,
    iconColor: 'text-emerald-600',
    defaultPath: '',
    nav: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'inventoryDashboard' },
          { label: 'Alerts', path: 'alerts', icon: Bell, feature: 'inventoryAlerts' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Items', path: 'items', icon: Boxes, feature: 'inventory' },
          { label: 'Stock In / Out', path: 'stock-in-out', icon: ArrowDownUp, feature: 'inventoryStockInOut' },
          { label: 'Transfers', path: 'transfers', icon: ArrowLeftRight, feature: 'inventoryTransfers' },
          { label: 'Adjustments', path: 'adjustments', icon: Edit3, feature: 'inventoryAdjustments' },
          { label: 'Cycle Count', path: 'cycle-count', icon: ClipboardList, feature: 'inventoryCycleCount' },
        ],
      },
      {
        items: [
          { label: 'Movements', path: 'movements', icon: ArrowLeftRight, feature: 'inventoryMovements', hidden: true },
        ],
      },
      {
        title: 'Insights',
        items: [
          { label: 'Reports', path: 'reports', icon: ClipboardCheck, feature: 'inventoryReports' },
        ],
      },
      {
        title: 'Master Data',
        items: [
          { label: 'Warehouses', path: 'warehouses', icon: Warehouse, feature: 'warehouses' },
          { label: 'Categories', path: 'categories', icon: Tag, feature: 'categories' },
          { label: 'UOM', path: 'uom', icon: Ruler, feature: 'uom' },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users', path: 'users', icon: Users, feature: 'inventoryUsers' },
          { label: 'System Logs', path: 'logs', icon: ClipboardList, feature: 'inventoryLogs' },
          { label: 'Settings', path: 'settings', icon: Settings, feature: 'inventorySettings' },
        ],
      },
      {
        items: [
          { label: 'User Profile', path: 'users/:id', icon: Users, feature: 'userProfile', hidden: true },
        ],
      },
    ],
  },
  {
    key: 'assets',
    name: 'Asset Management System',
    shortName: 'Assets',
    description: 'Asset registry, assignments, transfers, and lifecycle tracking.',
    icon: Package,
    iconColor: 'text-amber-600',
    defaultPath: '',
    nav: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'assetsDashboard' },
          { label: 'Alerts', path: 'alerts', icon: Bell, feature: 'assetsAlerts' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Registry', path: 'registry', icon: Package, feature: 'assets' },
          { label: 'Assignments', path: 'assignments', icon: UserCheck, feature: 'assetAssignments' },
          { label: 'Inspections', path: 'inspections', icon: ClipboardCheck, feature: 'assetInspections' },
          { label: 'Issues', path: 'issues', icon: AlertCircle, feature: 'assetsIssues' },
          { label: 'Maintenance', path: 'maintenance', icon: Wrench, feature: 'assetMaintenance' },
          { label: 'Disposal', path: 'disposal', icon: Trash2, feature: 'assetDisposal' },
        ],
      },
      {
        title: 'Insights',
        items: [
          { label: 'Reports', path: 'reports', icon: ClipboardCheck, feature: 'assetsReports' },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users', path: 'users', icon: Users, feature: 'assetsUsers' },
          { label: 'System Logs', path: 'logs', icon: ClipboardList, feature: 'assetsLogs' },
          { label: 'Settings', path: 'settings', icon: Settings, feature: 'assetsSettings' },
        ],
      },
      {
        items: [
          { label: 'User Profile', path: 'users/:id', icon: Users, feature: 'userProfile', hidden: true },
        ],
      },
    ],
  },
  {
    key: 'fleet',
    name: 'Fleet Management System',
    shortName: 'Fleet',
    description: 'Vehicles, trips, fuel, and fleet maintenance scheduling.',
    icon: Truck,
    iconColor: 'text-sky-600',
    defaultPath: '',
    nav: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'fleetDashboard' },
          { label: 'Alerts', path: 'alerts', icon: Bell, feature: 'fleetAlerts' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Vehicles', path: 'vehicles', icon: Truck, feature: 'fleet' },
          { label: 'Trips', path: 'trips', icon: RouteIcon, feature: 'fleetTrips' },
          { label: 'Fuel Logs', path: 'fuel-logs', icon: Fuel, feature: 'fleetFuelLogs' },
          { label: 'Issues', path: 'issues', icon: AlertCircle, feature: 'fleetIssues' },
          { label: 'Maintenance', path: 'maintenance', icon: Wrench, feature: 'fleetMaintenance' },
        ],
      },
      {
        title: 'Insights',
        items: [
          { label: 'Reports', path: 'reports', icon: ClipboardCheck, feature: 'fleetReports' },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users', path: 'users', icon: Users, feature: 'fleetUsers' },
          { label: 'System Logs', path: 'logs', icon: ClipboardList, feature: 'fleetLogs' },
          { label: 'Settings', path: 'settings', icon: Settings, feature: 'fleetSettings' },
        ],
      },
      {
        items: [
          { label: 'User Profile', path: 'users/:id', icon: Users, feature: 'userProfile', hidden: true },
        ],
      },
    ],
  },
  {
    key: 'procurement',
    name: 'Requisition & Procurement System',
    shortName: 'Procurement',
    description: 'Requests, approvals, and supplier management.',
    icon: ShoppingCart,
    iconColor: 'text-rose-600',
    defaultPath: '',
    nav: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'procurementDashboard' },
          { label: 'Alerts', path: 'alerts', icon: Bell, feature: 'procurementAlerts' },
        ],
      },
      {
        title: 'Workflow',
        items: [
          { label: 'Requests', path: 'requests', icon: ShoppingCart, feature: 'procurement' },
          { label: 'Approvals', path: 'approvals', icon: ListChecks, feature: 'procurementApprovals' },
        ],
      },
      {
        title: 'Insights',
        items: [
          { label: 'Reports', path: 'reports', icon: ClipboardCheck, feature: 'procurementReports' },
        ],
      },
      {
        title: 'Master Data',
        items: [
          { label: 'Suppliers', path: 'suppliers', icon: Truck, feature: 'suppliers' },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users', path: 'users', icon: Users, feature: 'procurementUsers' },
          { label: 'System Logs', path: 'logs', icon: ClipboardList, feature: 'procurementLogs' },
          { label: 'Settings', path: 'settings', icon: Settings, feature: 'procurementSettings' },
        ],
      },
      {
        items: [
          { label: 'User Profile', path: 'users/:id', icon: Users, feature: 'userProfile', hidden: true },
        ],
      },
    ],
  },
  {
    key: 'mis',
    name: 'Management Information System',
    shortName: 'MIS',
    description: 'Executive dashboards, KPIs, and cross-module visibility.',
    icon: LayoutDashboard,
    iconColor: 'text-blue-600',
    defaultPath: '',
    nav: [
      {
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'dashboard' },
          { label: 'Activity', path: 'activity', icon: Activity, feature: 'activity' },
        ],
      },
    ],
  },
  {
    key: 'tracking',
    name: 'Tracking System',
    shortName: 'Tracking',
    description: 'Live map, GPS telemetry, RFID/QR tags, and scan history.',
    icon: Radar,
    iconColor: 'text-cyan-600',
    defaultPath: '',
    nav: [
      {
        items: [
          { label: 'Live Map', path: '', icon: MapIcon, feature: 'tracking' },
          { label: 'GPS Real-Time', path: 'gps', icon: Satellite, feature: 'trackingGps' },
          { label: 'Tags', path: 'tags', icon: Tag, feature: 'trackingTags' },
          { label: 'Scan History', path: 'scans', icon: ScanLine, feature: 'trackingScans' },
        ],
      },
    ],
  },
  {
    key: 'maintenance',
    name: 'Maintenance Management System',
    shortName: 'Maintenance',
    description: 'Work orders, preventive schedules, and technicians.',
    icon: Wrench,
    iconColor: 'text-orange-600',
    defaultPath: '',
    nav: [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', path: '', icon: LayoutDashboard, feature: 'maintenanceDashboard' },
          { label: 'Alerts', path: 'alerts', icon: Bell, feature: 'maintenanceAlerts' },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Work Orders', path: 'work-orders', icon: Wrench, feature: 'maintenance' },
          { label: 'Schedule', path: 'schedule', icon: Calendar, feature: 'maintenanceSchedule' },
          { label: 'Technicians', path: 'technicians', icon: Users, feature: 'maintenanceTechnicians' },
        ],
      },
      {
        title: 'Insights',
        items: [
          { label: 'Reports', path: 'reports', icon: ClipboardCheck, feature: 'maintenanceReports' },
        ],
      },
      {
        title: 'Administration',
        items: [
          { label: 'Users', path: 'users', icon: UserCheck, feature: 'maintenanceUsers' },
          { label: 'System Logs', path: 'logs', icon: ClipboardList, feature: 'maintenanceLogs' },
          { label: 'Settings', path: 'settings', icon: Settings, feature: 'maintenanceSettings' },
        ],
      },
      {
        items: [
          { label: 'User Profile', path: 'users/:id', icon: Users, feature: 'userProfile', hidden: true },
        ],
      },
    ],
  },
]

const moduleByKey: Record<ModuleKey, EmsModule> = modules.reduce(
  (acc, m) => {
    acc[m.key] = m
    return acc
  },
  {} as Record<ModuleKey, EmsModule>,
)

export function getModule(key: string | undefined | null): EmsModule | null {
  if (!key) return null
  return (moduleByKey as Record<string, EmsModule | undefined>)[key] ?? null
}

export function getModulePath(moduleKey: ModuleKey, relativePath = ''): string {
  const base = `/module/${moduleKey}`
  if (!relativePath) return base
  return `${base}/${relativePath}`
}

export function getModuleDefaultPath(moduleKey: ModuleKey): string {
  const m = moduleByKey[moduleKey]
  return getModulePath(moduleKey, m.defaultPath)
}
