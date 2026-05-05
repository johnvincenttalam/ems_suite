export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'archived'
export type DocumentFileType = 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg'

export type DocumentPriority = 'low' | 'normal' | 'urgent'
export type DocumentConfidentiality = 'public' | 'internal' | 'confidential'
export type DocumentCategory =
  | 'legal'
  | 'finance'
  | 'hr'
  | 'procurement'
  | 'operations'
  | 'engineering'
  | 'compliance'
  | 'other'

export type ReceiptMode = 'physical' | 'email' | 'courier' | 'internal'
export type RoutingPurpose = 'review' | 'approval' | 'action' | 'info'
export type RoutingStatus = 'pending' | 'in_review' | 'completed'
export type AccessActivity = 'view' | 'download' | 'print' | 'edit'

export interface DocumentSignature {
  signerId: string
  signedAt: string
  comment?: string
  revokedAt?: string
  revokedBy?: string
  revocationReason?: string
}

export interface DocumentReceipt {
  receivedAt: string
  receivedBy: string
  mode: ReceiptMode
  senderSource: string
  recipientDept?: string
  pageCount?: number
  attachments?: number
  senderRefNumber?: string
}

export interface DocumentRouting {
  id: string
  routedAt: string
  senderId: string
  recipientId: string
  purpose: RoutingPurpose
  deadline?: string
  notes?: string
  status: RoutingStatus
  completedAt?: string
}

export interface DocumentAccessEntry {
  id: string
  userId: string
  timestamp: string
  activity: AccessActivity
  purpose?: string
}

export interface DocumentArchiveInfo {
  storageLocation: string
  retentionMonths: number
  disposalDate?: string
  backupLocation?: string
}

export interface AppDocument {
  id: string
  title: string
  description?: string
  fileName: string
  fileType: DocumentFileType
  fileSizeBytes: number
  status: DocumentStatus
  version: number
  approvers: string[]
  currentApproverIndex?: number
  signatures: DocumentSignature[]
  rejectedReason?: string
  rejectedBy?: string
  rejectedAt?: string
  tags?: string[]
  createdBy: string
  createdAt: string
  archivedAt?: string

  trackingNumber?: string
  category?: DocumentCategory
  priority?: DocumentPriority
  confidentiality?: DocumentConfidentiality
  departmentId?: string
  receipt?: DocumentReceipt
  routings?: DocumentRouting[]
  accessLog?: DocumentAccessEntry[]
  archiveInfo?: DocumentArchiveInfo
  validityUntil?: string
  deadline?: string
  finalizedAt?: string
  finalizedBy?: string
  /** Optional approval checklist template — surfaces a compliance review pre-flight inside the detail drawer. */
  checklistId?: string
}

export function isFinalized(doc: AppDocument): boolean {
  return !!doc.finalizedAt
}

export function isSignatureActive(sig: DocumentSignature): boolean {
  return !sig.revokedAt
}

export const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  legal: 'Legal',
  finance: 'Finance',
  hr: 'HR',
  procurement: 'Procurement',
  operations: 'Operations',
  engineering: 'Engineering',
  compliance: 'Compliance',
  other: 'Other',
}

export const PRIORITY_LABEL: Record<DocumentPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  urgent: 'Urgent',
}

export const CONFIDENTIALITY_LABEL: Record<DocumentConfidentiality, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
}

export const RECEIPT_MODE_LABEL: Record<ReceiptMode, string> = {
  physical: 'Physical',
  email: 'Email',
  courier: 'Courier',
  internal: 'Internal',
}

export const ROUTING_PURPOSE_LABEL: Record<RoutingPurpose, string> = {
  review: 'Review',
  approval: 'Approval',
  action: 'Action',
  info: 'For Information',
}

/**
 * Lifecycle phase derived from status + presence of metadata. Drives Inbox vs.
 * Documents vs. Workflow filtering: an unclassified `draft` is "inbox", a
 * classified `draft` is "documents", `in_review` is "workflow", etc.
 */
export type LifecyclePhase = 'inbox' | 'classified' | 'workflow' | 'finalized' | 'rejected' | 'archived'

export function getLifecyclePhase(doc: AppDocument): LifecyclePhase {
  if (doc.status === 'archived') return 'archived'
  if (doc.status === 'rejected') return 'rejected'
  if (doc.status === 'approved') return 'finalized'
  if (doc.status === 'in_review') return 'workflow'
  if (doc.status === 'draft' && !doc.category) return 'inbox'
  return 'classified'
}
