export { DocumentsPage } from './pages/documents-page'
export { InboxPage } from './pages/inbox-page'
export { WorkflowPage } from './pages/workflow-page'
export { CalendarPage } from './pages/calendar-page'
export { SdmsReportsPage } from './pages/sdms-reports-page'
export { ArchivePage } from './pages/archive-page'
export { SdmsDashboard } from './pages/sdms-dashboard'
export { SdmsAlertsPage } from './pages/sdms-alerts-page'
export { SdmsLogsPage } from './pages/sdms-logs-page'
export { SdmsUsersPage } from './pages/sdms-users-page'
export { SdmsSettingsPage } from './pages/sdms-settings-page'
export { useDocuments } from './hooks/use-documents'
export { documentsApi } from './api/documents-api'
export { mockDocuments } from './data/mock-documents'
export type {
  AppDocument,
  DocumentStatus,
  DocumentFileType,
  DocumentSignature,
  DocumentCategory,
  DocumentPriority,
  DocumentConfidentiality,
  DocumentReceipt,
  DocumentRouting,
  DocumentAccessEntry,
  DocumentArchiveInfo,
  ReceiptMode,
  RoutingPurpose,
  RoutingStatus,
  AccessActivity,
  LifecyclePhase,
} from './types'
export {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  CONFIDENTIALITY_LABEL,
  RECEIPT_MODE_LABEL,
  ROUTING_PURPOSE_LABEL,
  getLifecyclePhase,
} from './types'
