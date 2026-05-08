/**
 * Lifecycle status — does this asset still exist on the books?
 *  - active:       in service, available or assigned
 *  - maintenance:  out for service / repair
 *  - retiring:     pending disposal approval (stock unchanged until approved)
 *  - disposed:     sold/scrapped/donated; kept on the books for audit only
 */
export type AssetStatus = 'active' | 'maintenance' | 'retiring' | 'disposed'

/**
 * Physical condition — distinct from lifecycle. An "active" asset can still be
 * Fair or Poor; a "disposed" one has its last-known condition preserved.
 */
export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'out_of_service'

export type DisposalType = 'sold' | 'scrapped' | 'donated' | 'lost' | 'traded_in'

export interface Asset {
  id: string
  /** Human-readable code surfaced in tables and tags (e.g. "GEN-0012"). */
  assetCode: string
  name: string
  /** Manufacturer serial number — distinct from assetCode. */
  serialNumber: string
  /** Manufacturer / model name (optional). */
  model?: string
  vendor?: string
  categoryId: string
  locationId: string
  status: AssetStatus
  condition: AssetCondition
  assignedTo?: string
  purchaseDate: string
  purchaseCost?: number
  warrantyExpiry?: string
  /** Straight-line depreciation inputs. usefulLifeMonths drives the schedule;
   * salvageValue is the residual value at end-of-life. */
  usefulLifeMonths?: number
  salvageValue?: number
  /** Optional thumbnail / photo URL. */
  imageUrl?: string
  description?: string
  notes?: string
  /** Optional checklist template — used for inspection / intake / disposal. */
  checklistId?: string
  /** Disposal metadata, populated when status flips to 'retiring' on submit
   * and finalized when an approver runs `approveDisposal`. Stays on the asset
   * after disposal completes for audit. */
  disposal?: {
    type: DisposalType
    amount?: number
    disposedTo?: string
    disposedDate: string
    disposedBy: string
    reason: string
    /** Display name of the approver assigned at submission. Only this user
     * (or an inventory admin in real-world setups) can act on the request. */
    pendingApproverName?: string
    /** Approver who authorized the disposal (when approval was required). */
    approvedBy?: string
    approvedAt?: string
  }
  createdAt: string
}

export interface AssetAssignment {
  id: string
  assetId: string
  assignedTo: string
  assignedDate: string
  returnedDate?: string
  notes?: string
}

/**
 * Lifecycle event — every state change on an asset emits one of these so the
 * History tab can render a complete audit trail. Independent of (and broader
 * than) AssetAssignment, which is only the assignment-state record.
 */
export type AssetEventType =
  | 'created'
  | 'assigned'
  | 'returned'
  | 'transferred'
  | 'condition_changed'
  | 'inspection'
  | 'maintenance_started'
  | 'maintenance_ended'
  | 'disposal_submitted'
  | 'disposal_approved'
  | 'disposal_rejected'

export interface AssetEvent {
  id: string
  assetId: string
  type: AssetEventType
  /** Free-text narrative; UI joins this with structured fields below. */
  detail: string
  /** When the event occurred. */
  timestamp: string
  /** User name responsible for the event (operator / approver). */
  actorName: string
  /** Type-specific payload kept loose so consumers can pull what they need. */
  payload?: {
    fromUserId?: string
    toUserId?: string
    fromLocationId?: string
    toLocationId?: string
    fromCondition?: AssetCondition
    toCondition?: AssetCondition
    inspectionId?: string
    disposalType?: DisposalType
    disposalAmount?: number
    rejectionReason?: string
  }
}

/**
 * Inspection — pass/fail per checklist item with optional remarks. Linked to
 * an asset and (optionally) a checklist template.
 */
export type InspectionResult = 'pass' | 'fail' | 'na'
export type InspectionStatus = 'draft' | 'submitted'

export interface InspectionLine {
  /** Free-text line label (e.g. "Hydraulic System"). */
  label: string
  result: InspectionResult
  remarks?: string
}

export interface Inspection {
  id: string
  assetId: string
  checklistId?: string
  inspectionDate: string
  inspector: string
  status: InspectionStatus
  lines: InspectionLine[]
  /** Roll-up: any 'fail' result demotes overallResult to 'fail'. */
  overallResult: InspectionResult
  notes?: string
  createdAt: string
  submittedAt?: string
}
