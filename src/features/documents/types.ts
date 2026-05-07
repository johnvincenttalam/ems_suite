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

export type SignatureMethod = 'click-to-sign' | 'pki' | 'otp' | 'biometric'
export type SignatureReason = 'approval' | 'review' | 'witness' | 'acknowledgment'

/**
 * A signature slot is a placement region on a document. Coordinates are
 * normalized (0..1) so they survive zoom and viewport changes; rendering code
 * multiplies by the container size to get pixel positions.
 */
export interface SignatureSlot {
  key: string
  page: number
  x: number
  y: number
  width: number
  height: number
}

/** A named approver chain that can be picked when creating a document, so users
 * don't have to hand-pick the same sequence every time. */
export interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  /** Suggested category this template fits — used to auto-suggest in the form. */
  category?: DocumentCategory
  approverIds: string[]
  /** Predefined signature slot positions inherited by documents created from
   * this template. Slot order should align with approverIds order so signer N
   * lands in slot N. */
  signatureSlots?: SignatureSlot[]
  /** URL of a sample/reference document (image or PDF) used as the visual
   * canvas in the slot editor. Documents created from the template can also
   * inherit this URL for demo purposes. */
  referenceUrl?: string
}

export interface DocumentSignature {
  signerId: string
  signedAt: string
  comment?: string
  /** How identity was verified at sign time. Mock template uses 'click-to-sign'.
   * Real PKI deployments would set 'pki' and additionally store certificate data. */
  method?: SignatureMethod
  /** Why the signer signed. Defaults to 'approval'. */
  reason?: SignatureReason
  /** Snapshot of doc.version at sign time — proves which content was signed. */
  documentVersion?: number
  /** Browser/device fingerprint captured client-side. Server-side impls would
   * also record IP and authentication context. */
  userAgent?: string
  /** Base64-encoded PNG of the signer's captured signature (drawn or uploaded). */
  signatureImage?: string
  /** Slot the signature was placed in. Maps to AppDocument.signatureSlots[].key. */
  slotKey?: string
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
  /** 'final' = author cannot resubmit; 'revision_request' = author can revise
   * and resend. Defaults to 'final' for backward-compatible mock data. */
  rejectionType?: 'final' | 'revision_request'
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
  /** Absolute or root-relative URL to a renderable preview asset. PreviewArea
   * dispatches by fileType: png/jpg renders as an image, pdf renders via PdfViewer. */
  assetUrl?: string
  /** Predefined signature placement regions on the document. */
  signatureSlots?: SignatureSlot[]
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

export const SIGNATURE_METHOD_LABEL: Record<SignatureMethod, string> = {
  'click-to-sign': 'Click-to-sign',
  pki: 'PKI certificate',
  otp: 'One-time password',
  biometric: 'Biometric',
}

export const SIGNATURE_REASON_LABEL: Record<SignatureReason, string> = {
  approval: 'Approval',
  review: 'Review',
  witness: 'Witness',
  acknowledgment: 'Acknowledgment',
}

/** SDMS uses "Disapproved" as the user-facing word for the `rejected` status so
 * the language matches the Approve action. Internal type stays `'rejected'`. */
export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Disapproved',
  archived: 'Archived',
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
