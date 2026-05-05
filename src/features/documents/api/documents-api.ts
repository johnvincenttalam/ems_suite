import type {
  AccessActivity,
  AppDocument,
  DocumentAccessEntry,
  DocumentArchiveInfo,
  DocumentCategory,
  DocumentConfidentiality,
  DocumentFileType,
  DocumentPriority,
  DocumentReceipt,
  DocumentRouting,
  DocumentSignature,
  ReceiptMode,
  RoutingPurpose,
  RoutingStatus,
} from '@/features/documents/types'
import { mockDocuments } from '@/features/documents/data/mock-documents'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface RegisterReceiptInput {
  title: string
  description?: string
  fileName: string
  fileType: DocumentFileType
  fileSizeBytes: number
  receipt: Omit<DocumentReceipt, 'receivedAt' | 'receivedBy'> & {
    receivedAt?: string
    receivedBy: string
  }
}

interface ClassifyInput {
  category: DocumentCategory
  priority: DocumentPriority
  confidentiality: DocumentConfidentiality
  departmentId?: string
  tags?: string[]
  summary?: string
}

interface RouteInput {
  senderId: string
  recipientId: string
  purpose: RoutingPurpose
  deadline?: string
  notes?: string
}

interface UploadDocumentInput {
  title: string
  description?: string
  fileName: string
  fileType: DocumentFileType
  fileSizeBytes: number
  approvers: string[]
  tags?: string[]
  createdBy: string
  category?: DocumentCategory
  priority?: DocumentPriority
  confidentiality?: DocumentConfidentiality
  departmentId?: string
  deadline?: string
}

function nextDocumentId(): string {
  const max = mockDocuments.reduce((m, d) => {
    const n = Number(d.id.replace(/^DOC-/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `DOC-${String(max + 1).padStart(3, '0')}`
}

/**
 * Tracking numbers are SDMS-YYYY-NNNN. Year is the receipt year so year-end
 * roll-overs don't reset existing IDs; sequence is global across all tracked
 * docs to avoid collisions when receipts are registered out of order.
 */
function nextTrackingNumber(receiptYear: number): string {
  const max = mockDocuments.reduce((m, d) => {
    if (!d.trackingNumber) return m
    const match = /^SDMS-\d{4}-(\d{4})$/.exec(d.trackingNumber)
    if (!match) return m
    const n = Number(match[1])
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `SDMS-${receiptYear}-${String(max + 1).padStart(4, '0')}`
}

let routingCounter = 0
function nextRoutingId(docId: string): string {
  routingCounter += 1
  return `RT-${docId.replace(/^DOC-/, '')}-${routingCounter}`
}

let accessCounter = 0
function nextAccessId(docId: string): string {
  accessCounter += 1
  return `AL-${docId.replace(/^DOC-/, '')}-${accessCounter}`
}

function findOrThrow(docId: string): AppDocument {
  const doc = mockDocuments.find((d) => d.id === docId)
  if (!doc) throw new Error(`Document ${docId} not found`)
  return doc
}

/**
 * Documents API — swap with real HTTP when backend is ready:
 *   list:        () => http.get<AppDocument[]>('/documents')
 *   register:    (form) => http.post<AppDocument>('/documents/receipts', form)
 *   classify:    (id, input) => http.post<AppDocument>(`/documents/${id}/classify`, input)
 *   route:       (id, input) => http.post<AppDocument>(`/documents/${id}/routings`, input)
 *   completeRouting: (id, rid) => http.patch<AppDocument>(`/documents/${id}/routings/${rid}`, { status: 'completed' })
 *   recordAccess:(id, input) => http.post<AppDocument>(`/documents/${id}/access`, input)
 *   upload:      (form) => http.post<AppDocument>('/documents', form) // multipart/form-data
 *   sign:        (id, comment?) => http.post<AppDocument>(`/documents/${id}/sign`, { comment })
 *   reject:      (id, reason) => http.post<AppDocument>(`/documents/${id}/reject`, { reason })
 *   archive:     (id, info) => http.post<AppDocument>(`/documents/${id}/archive`, info)
 */
export const documentsApi = {
  list: async (): Promise<AppDocument[]> => {
    await delay()
    return [...mockDocuments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /**
   * Register a freshly-received document as a draft in the inbox. Captures
   * receipt metadata (mode, sender, etc.) and assigns a tracking number.
   * Workflow does NOT start until classify + start-workflow run separately.
   */
  registerReceipt: async (input: RegisterReceiptInput): Promise<AppDocument> => {
    await delay(150)
    const receivedAt = input.receipt.receivedAt ?? new Date().toISOString()
    const year = Number(receivedAt.slice(0, 4))
    const doc: AppDocument = {
      id: nextDocumentId(),
      trackingNumber: nextTrackingNumber(year),
      title: input.title,
      description: input.description,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes,
      status: 'draft',
      version: 1,
      approvers: [],
      signatures: [],
      createdBy: input.receipt.receivedBy,
      createdAt: receivedAt,
      receipt: { ...input.receipt, receivedAt },
    }
    mockDocuments.push(doc)

    recordAudit({
      userId: input.receipt.receivedBy,
      action: 'create',
      module: 'Documents',
      detail: `Registered receipt for "${doc.title}" (${doc.trackingNumber}) via ${input.receipt.mode}`,
    })

    return doc
  },

  /**
   * Apply classification + tagging to a doc that is still a draft. After this
   * the doc shows up in the main Documents list (it leaves the Inbox).
   */
  classify: async (docId: string, input: ClassifyInput, userId: string): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    if (doc.status !== 'draft') throw new Error(`Only draft documents can be classified`)

    doc.category = input.category
    doc.priority = input.priority
    doc.confidentiality = input.confidentiality
    doc.departmentId = input.departmentId
    if (input.tags) doc.tags = input.tags
    if (input.summary && !doc.description) doc.description = input.summary
    if (!doc.trackingNumber) {
      doc.trackingNumber = nextTrackingNumber(Number(doc.createdAt.slice(0, 4)))
    }

    recordAudit({
      userId,
      action: 'update',
      module: 'Documents',
      detail: `Classified "${doc.title}" — ${input.category}, ${input.priority}, ${input.confidentiality}`,
    })

    return doc
  },

  /**
   * Add a routing entry to a document. Reflects send/forward actions in the
   * Document Directory's routing log; does not change workflow status.
   */
  route: async (docId: string, input: RouteInput): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    const routing: DocumentRouting = {
      id: nextRoutingId(docId),
      routedAt: new Date().toISOString(),
      senderId: input.senderId,
      recipientId: input.recipientId,
      purpose: input.purpose,
      deadline: input.deadline,
      notes: input.notes,
      status: 'pending',
    }
    doc.routings = [...(doc.routings ?? []), routing]

    recordAudit({
      userId: input.senderId,
      action: 'update',
      module: 'Documents',
      detail: `Routed "${doc.title}" to ${input.recipientId} for ${input.purpose}`,
    })

    return doc
  },

  /**
   * Mark a routing entry complete. Used when the recipient signs off or
   * acknowledges; the workflow chain mutations (sign/reject) auto-complete the
   * matching routing entry, so callers rarely need this directly.
   */
  completeRouting: async (
    docId: string,
    routingId: string,
    completerId: string,
    status: RoutingStatus = 'completed',
  ): Promise<AppDocument> => {
    await delay(120)
    const doc = findOrThrow(docId)
    const r = doc.routings?.find((x) => x.id === routingId)
    if (!r) throw new Error(`Routing ${routingId} not found on ${docId}`)
    r.status = status
    if (status === 'completed') r.completedAt = new Date().toISOString()

    recordAudit({
      userId: completerId,
      action: 'update',
      module: 'Documents',
      detail: `Closed routing ${routingId} on "${doc.title}" — ${status}`,
    })

    return doc
  },

  /**
   * Record a view/download/print/edit event on a document. Used by the detail
   * drawer to log accesses to sensitive docs (per spec 2.2.1.9).
   */
  recordAccess: async (
    docId: string,
    userId: string,
    activity: AccessActivity = 'view',
    purpose?: string,
  ): Promise<AppDocument> => {
    await delay(80)
    const doc = findOrThrow(docId)
    const entry: DocumentAccessEntry = {
      id: nextAccessId(docId),
      userId,
      timestamp: new Date().toISOString(),
      activity,
      purpose,
    }
    doc.accessLog = [...(doc.accessLog ?? []), entry]

    if (activity !== 'view' || doc.confidentiality === 'confidential') {
      recordAudit({
        userId,
        action: 'update',
        module: 'Documents',
        detail: `${activity[0].toUpperCase()}${activity.slice(1)} access to "${doc.title}"${purpose ? ` — ${purpose}` : ''}`,
      })
    }

    return doc
  },

  /**
   * Upload a new document and immediately enter the multi-step workflow.
   * Status starts at 'in_review', currentApproverIndex at 0; signatures empty.
   * Throws if approvers is empty.
   */
  upload: async (input: UploadDocumentInput): Promise<AppDocument> => {
    await delay(150)
    if (input.approvers.length === 0) throw new Error('At least one approver is required')

    const createdAt = new Date().toISOString()
    const year = Number(createdAt.slice(0, 4))

    const doc: AppDocument = {
      id: nextDocumentId(),
      trackingNumber: nextTrackingNumber(year),
      title: input.title,
      description: input.description,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes,
      status: 'in_review',
      version: 1,
      approvers: [...input.approvers],
      currentApproverIndex: 0,
      signatures: [],
      tags: input.tags,
      createdBy: input.createdBy,
      createdAt,
      category: input.category,
      priority: input.priority,
      confidentiality: input.confidentiality,
      departmentId: input.departmentId,
      deadline: input.deadline,
    }
    mockDocuments.push(doc)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Documents',
      detail: `Uploaded "${doc.title}" — workflow started (${doc.approvers.length} approver${doc.approvers.length === 1 ? '' : 's'})`,
    })

    return doc
  },

  /**
   * Promote a classified draft into the workflow. Sets approvers, flips status
   * to 'in_review', and seeds the routing log with the first approval hop.
   */
  startWorkflow: async (
    docId: string,
    approvers: string[],
    starterId: string,
    deadline?: string,
  ): Promise<AppDocument> => {
    await delay(150)
    if (approvers.length === 0) throw new Error('At least one approver is required')
    const doc = findOrThrow(docId)
    if (doc.status !== 'draft') throw new Error(`Only draft documents can enter workflow`)

    doc.approvers = [...approvers]
    doc.currentApproverIndex = 0
    doc.signatures = []
    doc.status = 'in_review'
    if (deadline) doc.deadline = deadline

    const routing: DocumentRouting = {
      id: nextRoutingId(docId),
      routedAt: new Date().toISOString(),
      senderId: starterId,
      recipientId: approvers[0],
      purpose: 'approval',
      deadline,
      status: 'pending',
    }
    doc.routings = [...(doc.routings ?? []), routing]

    recordAudit({
      userId: starterId,
      action: 'update',
      module: 'Documents',
      detail: `Started workflow on "${doc.title}" — ${approvers.length} approver${approvers.length === 1 ? '' : 's'}`,
    })

    return doc
  },

  /**
   * Sign as the next expected approver. Appends a signature, advances the
   * approver pointer; if the last approver has signed, status flips to
   * 'approved'. Throws if the document is not in_review or signerId is not the
   * next expected approver — workflow is sequential per the EMS spec.
   */
  sign: async (docId: string, signerId: string, comment?: string): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    if (doc.status !== 'in_review') throw new Error(`Document ${docId} is not in review`)

    const expectedIndex = doc.currentApproverIndex ?? 0
    const expectedApprover = doc.approvers[expectedIndex]
    if (signerId !== expectedApprover) {
      throw new Error(`${signerId} is not the next approver for ${docId}`)
    }

    const sig: DocumentSignature = {
      signerId,
      signedAt: new Date().toISOString(),
      ...(comment ? { comment } : {}),
    }
    doc.signatures = [...doc.signatures, sig]
    doc.currentApproverIndex = expectedIndex + 1
    const finalSignature = doc.currentApproverIndex >= doc.approvers.length
    if (finalSignature) doc.status = 'approved'

    const pendingRoute = doc.routings?.find(
      (r) => r.recipientId === signerId && r.status !== 'completed',
    )
    if (pendingRoute) {
      pendingRoute.status = 'completed'
      pendingRoute.completedAt = sig.signedAt
    }
    if (!finalSignature) {
      const nextApprover = doc.approvers[doc.currentApproverIndex]
      const handoff: DocumentRouting = {
        id: nextRoutingId(docId),
        routedAt: sig.signedAt,
        senderId: signerId,
        recipientId: nextApprover,
        purpose: 'approval',
        deadline: doc.deadline,
        status: 'pending',
      }
      doc.routings = [...(doc.routings ?? []), handoff]
    }

    recordAudit({
      userId: signerId,
      action: finalSignature ? 'approve' : 'update',
      module: 'Documents',
      detail: finalSignature
        ? `Final signature on "${doc.title}" — approved`
        : `Signed "${doc.title}" (step ${expectedIndex + 1}/${doc.approvers.length})`,
    })

    return doc
  },

  /**
   * Reject a document in review with a reason. Status flips to 'rejected'; the
   * approval pointer is preserved so the audit trail shows where it stopped.
   * Throws if the document is not in review.
   */
  reject: async (docId: string, reason: string, rejecterId: string): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    if (doc.status !== 'in_review') throw new Error(`Document ${docId} is not in review`)

    doc.status = 'rejected'
    doc.rejectedBy = rejecterId
    doc.rejectedAt = new Date().toISOString()
    doc.rejectedReason = reason

    const pendingRoute = doc.routings?.find(
      (r) => r.recipientId === rejecterId && r.status !== 'completed',
    )
    if (pendingRoute) {
      pendingRoute.status = 'completed'
      pendingRoute.completedAt = doc.rejectedAt
      pendingRoute.notes = pendingRoute.notes
        ? `${pendingRoute.notes} — Rejected: ${reason}`
        : `Rejected: ${reason}`
    }

    recordAudit({
      userId: rejecterId,
      action: 'reject',
      module: 'Documents',
      detail: `Rejected "${doc.title}" — ${reason}`,
    })

    return doc
  },

  /**
   * Finalize an approved document — locks signatures, stamps final approver,
   * sets validity period. After this, signatures cannot be revoked and the
   * document can be archived. Throws if status !== 'approved' or already
   * finalized. Per EMS spec 2.2.1.7.
   */
  finalize: async (
    docId: string,
    userId: string,
    validityUntil?: string,
  ): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    if (doc.status !== 'approved') throw new Error('Only approved documents can be finalized')
    if (doc.finalizedAt) throw new Error('Document is already finalized')

    doc.finalizedAt = new Date().toISOString()
    doc.finalizedBy = userId
    if (validityUntil) doc.validityUntil = validityUntil

    recordAudit({
      userId,
      action: 'approve',
      module: 'Documents',
      detail: `Finalized "${doc.title}" — signatures locked${validityUntil ? `, valid until ${validityUntil}` : ''}`,
    })

    return doc
  },

  /**
   * Revoke a signature on an in-review or approved document. Rolls back the
   * approver pointer to the revoked signature's index and flips status back
   * to 'in_review' if it was 'approved'. Forbidden once the document has
   * been finalized — that's the whole point of finalization.
   *
   * Only the original signer or an admin should call this; the API enforces
   * the original-signer rule (`signerId` must match `revokerId`).
   */
  revokeSignature: async (
    docId: string,
    revokerId: string,
    reason: string,
  ): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    if (doc.finalizedAt) throw new Error('Cannot revoke a signature on a finalized document')
    if (doc.status !== 'in_review' && doc.status !== 'approved') {
      throw new Error(`Cannot revoke a signature on a ${doc.status} document`)
    }

    const idx = doc.signatures.findIndex((s) => s.signerId === revokerId && !s.revokedAt)
    if (idx < 0) throw new Error(`No active signature by ${revokerId} on ${docId}`)

    const sig = doc.signatures[idx]
    const revokedAt = new Date().toISOString()
    sig.revokedAt = revokedAt
    sig.revokedBy = revokerId
    sig.revocationReason = reason

    doc.currentApproverIndex = idx
    if (doc.status === 'approved') doc.status = 'in_review'

    recordAudit({
      userId: revokerId,
      action: 'update',
      module: 'Documents',
      detail: `Revoked signature on "${doc.title}" — ${reason}`,
    })

    return doc
  },

  /**
   * Archive a finalized document with retention metadata. Throws if the
   * document is not approved or has not been finalized — per EMS spec, only
   * finalized documents can be archived.
   */
  archive: async (
    docId: string,
    userId: string,
    info?: Partial<DocumentArchiveInfo>,
  ): Promise<AppDocument> => {
    await delay(150)
    const doc = findOrThrow(docId)
    if (doc.status !== 'approved') throw new Error(`Only approved documents can be archived`)
    if (!doc.finalizedAt) throw new Error(`Document must be finalized before archiving`)

    const archivedAt = new Date().toISOString()
    doc.status = 'archived'
    doc.archivedAt = archivedAt

    const retentionMonths = info?.retentionMonths ?? 60
    const disposalDate = info?.disposalDate ?? computeDisposalDate(archivedAt, retentionMonths)
    doc.archiveInfo = {
      storageLocation: info?.storageLocation ?? 'Vault A — Default Shelf',
      retentionMonths,
      disposalDate,
      backupLocation: info?.backupLocation ?? 'Off-site — Cloud Cold Storage',
    }

    recordAudit({
      userId,
      action: 'update',
      module: 'Documents',
      detail: `Archived "${doc.title}" — retained ${retentionMonths} months`,
    })

    return doc
  },
}

function computeDisposalDate(archivedAt: string, retentionMonths: number): string {
  const d = new Date(archivedAt)
  d.setMonth(d.getMonth() + retentionMonths)
  return d.toISOString().slice(0, 10)
}

export const ReceiptModeOptions: { value: ReceiptMode; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'email', label: 'Email' },
  { value: 'courier', label: 'Courier' },
  { value: 'internal', label: 'Internal' },
]
