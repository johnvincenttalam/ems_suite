import type {
  Asset,
  AssetAssignment,
  AssetCondition,
  AssetEvent,
  AssetEventType,
  DisposalType,
  Inspection,
  InspectionLine,
  InspectionResult,
} from '@/features/assets/types'
import {
  mockAssets,
  mockAssetAssignments,
  mockAssetEvents,
  mockInspections,
} from '@/features/assets/data/mock-assets'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

// Counters seeded from the highest existing IDs so synthesized IDs don't
// collide with mock seed data.
const seedCounter = (records: { id: string }[], prefix: string): number =>
  records.reduce((max, r) => {
    const n = Number(r.id.replace(new RegExp(`^${prefix}`), ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)

let assetCounter = seedCounter(mockAssets, 'AST-')
let assignmentCounter = seedCounter(mockAssetAssignments, 'ASN-')
let eventCounter = seedCounter(mockAssetEvents, 'EVT-')
let inspectionCounter = seedCounter(mockInspections, 'INSP-')

function nextAssetId(): string { assetCounter += 1; return `AST-${String(assetCounter).padStart(3, '0')}` }
function nextAssignmentId(): string { assignmentCounter += 1; return `ASN-${String(assignmentCounter).padStart(3, '0')}` }
function nextEventId(): string { eventCounter += 1; return `EVT-${String(eventCounter).padStart(4, '0')}` }
function nextInspectionId(): string { inspectionCounter += 1; return `INSP-${String(inspectionCounter).padStart(4, '0')}` }

interface EmitEventInput {
  assetId: string
  type: AssetEventType
  detail: string
  actorName: string
  payload?: AssetEvent['payload']
}

function emitEvent(input: EmitEventInput): AssetEvent {
  const event: AssetEvent = {
    id: nextEventId(),
    assetId: input.assetId,
    type: input.type,
    detail: input.detail,
    timestamp: new Date().toISOString(),
    actorName: input.actorName,
    payload: input.payload,
  }
  mockAssetEvents.push(event)
  return event
}

function findAsset(id: string): Asset {
  const asset = mockAssets.find((a) => a.id === id)
  if (!asset) throw new Error(`Asset ${id} not found`)
  return asset
}

interface CreateAssetInput {
  name: string
  serialNumber: string
  categoryId: string
  locationId: string
  purchaseDate: string
  purchaseCost?: number
  condition?: AssetCondition
  /** assetCode is auto-generated from category prefix when not supplied. */
  assetCode?: string
  model?: string
  vendor?: string
  warrantyExpiry?: string
  usefulLifeMonths?: number
  salvageValue?: number
  imageUrl?: string
  description?: string
  notes?: string
  checklistId?: string
  createdBy: string
}

interface UpdateAssetInput {
  name?: string
  serialNumber?: string
  categoryId?: string
  locationId?: string
  condition?: AssetCondition
  assetCode?: string
  model?: string
  vendor?: string
  purchaseDate?: string
  purchaseCost?: number
  warrantyExpiry?: string
  usefulLifeMonths?: number
  salvageValue?: number
  imageUrl?: string
  description?: string
  notes?: string
  checklistId?: string
  updatedBy: string
}

interface AssignInput {
  assetId: string
  userId: string
  notes?: string
  actorName: string
}

interface ReturnInput {
  assetId: string
  actorName: string
  notes?: string
}

interface TransferInput {
  assetId: string
  toLocationId: string
  notes?: string
  actorName: string
}

interface SubmitDisposalInput {
  assetId: string
  type: DisposalType
  reason: string
  amount?: number
  disposedTo?: string
  disposedDate: string
  /** Approver's display name. Required — disposals always need approval. */
  approverName: string
  submittedBy: string
}

interface CreateInspectionInput {
  assetId: string
  inspectionDate: string
  inspector: string
  checklistId?: string
  lines: InspectionLine[]
  notes?: string
  /** When true the inspection is recorded as 'submitted'; otherwise 'draft'. */
  submit: boolean
}

/**
 * Assets API — swap with real HTTP when backend is ready. Mutations operate
 * directly on the in-memory mock arrays; React Query consumers re-fetch via
 * `invalidateQueries(['assets', ...])` after each call.
 */
export const assetsApi = {
  list: async (): Promise<Asset[]> => {
    await delay()
    return mockAssets
  },

  listAssignments: async (): Promise<AssetAssignment[]> => {
    await delay()
    return [...mockAssetAssignments].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))
  },

  listEvents: async (assetId?: string): Promise<AssetEvent[]> => {
    await delay()
    const all = assetId ? mockAssetEvents.filter((e) => e.assetId === assetId) : mockAssetEvents
    return [...all].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  },

  listInspections: async (assetId?: string): Promise<Inspection[]> => {
    await delay()
    const all = assetId ? mockInspections.filter((i) => i.assetId === assetId) : mockInspections
    return [...all].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))
  },

  create: async (input: CreateAssetInput): Promise<Asset> => {
    await delay(180)
    if (mockAssets.some((a) => a.serialNumber === input.serialNumber)) {
      throw new Error(`Serial number "${input.serialNumber}" already exists`)
    }
    const asset: Asset = {
      id: nextAssetId(),
      assetCode: input.assetCode ?? `AST-${String(assetCounter).padStart(4, '0')}`,
      name: input.name,
      serialNumber: input.serialNumber,
      model: input.model,
      vendor: input.vendor,
      categoryId: input.categoryId,
      locationId: input.locationId,
      status: 'active',
      condition: input.condition ?? 'good',
      purchaseDate: input.purchaseDate,
      purchaseCost: input.purchaseCost,
      warrantyExpiry: input.warrantyExpiry,
      usefulLifeMonths: input.usefulLifeMonths,
      salvageValue: input.salvageValue,
      imageUrl: input.imageUrl,
      description: input.description,
      notes: input.notes,
      checklistId: input.checklistId,
      createdAt: new Date().toISOString(),
    }
    mockAssets.push(asset)
    emitEvent({
      assetId: asset.id,
      type: 'created',
      detail: `Registered ${asset.name} (${asset.assetCode})`,
      actorName: input.createdBy,
    })
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Assets',
      detail: `Registered asset ${asset.assetCode} — ${asset.name}`,
    })
    return asset
  },

  update: async (id: string, input: UpdateAssetInput): Promise<Asset> => {
    await delay(120)
    const asset = findAsset(id)
    const previousCondition = asset.condition
    const { updatedBy, ...patch } = input
    Object.assign(
      asset,
      Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    )
    if (input.condition && input.condition !== previousCondition) {
      emitEvent({
        assetId: asset.id,
        type: 'condition_changed',
        detail: `Condition: ${previousCondition} → ${input.condition}`,
        actorName: updatedBy,
        payload: { fromCondition: previousCondition, toCondition: input.condition },
      })
    }
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Assets',
      detail: `Updated asset ${asset.assetCode} — ${asset.name}`,
    })
    return asset
  },

  assign: async (input: AssignInput): Promise<{ asset: Asset; assignment: AssetAssignment }> => {
    await delay(120)
    const asset = findAsset(input.assetId)
    if (asset.status === 'disposed') throw new Error('Cannot assign a disposed asset')
    if (asset.assignedTo) throw new Error('Asset is already assigned — return it first')

    asset.assignedTo = input.userId

    const assignment: AssetAssignment = {
      id: nextAssignmentId(),
      assetId: asset.id,
      assignedTo: input.userId,
      assignedDate: new Date().toISOString().slice(0, 10),
      notes: input.notes,
    }
    mockAssetAssignments.push(assignment)

    emitEvent({
      assetId: asset.id,
      type: 'assigned',
      detail: `Assigned to ${input.userId}${input.notes ? ` — ${input.notes}` : ''}`,
      actorName: input.actorName,
      payload: { toUserId: input.userId },
    })
    recordAudit({
      userId: input.actorName,
      action: 'update',
      module: 'Assets',
      detail: `Assigned ${asset.assetCode} (${asset.name}) to user ${input.userId}`,
    })
    return { asset, assignment }
  },

  return: async (input: ReturnInput): Promise<Asset> => {
    await delay(120)
    const asset = findAsset(input.assetId)
    if (!asset.assignedTo) throw new Error('Asset is not currently assigned')
    const previousAssignee = asset.assignedTo

    // Close the open assignment record.
    const open = [...mockAssetAssignments]
      .reverse()
      .find((a) => a.assetId === asset.id && !a.returnedDate)
    if (open) {
      open.returnedDate = new Date().toISOString().slice(0, 10)
      if (input.notes) open.notes = input.notes
    }
    asset.assignedTo = undefined

    emitEvent({
      assetId: asset.id,
      type: 'returned',
      detail: `Returned by ${previousAssignee}${input.notes ? ` — ${input.notes}` : ''}`,
      actorName: input.actorName,
      payload: { fromUserId: previousAssignee },
    })
    recordAudit({
      userId: input.actorName,
      action: 'update',
      module: 'Assets',
      detail: `Returned ${asset.assetCode} (${asset.name}) from ${previousAssignee}`,
    })
    return asset
  },

  transfer: async (input: TransferInput): Promise<Asset> => {
    await delay(120)
    const asset = findAsset(input.assetId)
    if (asset.status === 'disposed') throw new Error('Cannot transfer a disposed asset')
    if (asset.locationId === input.toLocationId) throw new Error('Asset is already at the target location')
    const fromLocationId = asset.locationId
    asset.locationId = input.toLocationId

    emitEvent({
      assetId: asset.id,
      type: 'transferred',
      detail: `Transferred ${fromLocationId} → ${input.toLocationId}${input.notes ? ` — ${input.notes}` : ''}`,
      actorName: input.actorName,
      payload: { fromLocationId, toLocationId: input.toLocationId },
    })
    recordAudit({
      userId: input.actorName,
      action: 'update',
      module: 'Assets',
      detail: `Transferred ${asset.assetCode} from ${fromLocationId} to ${input.toLocationId}`,
    })
    return asset
  },

  /**
   * Submit a disposal — flips status to 'retiring' and emits a pending event.
   * The named approver runs `approveDisposal` to finalize, or `rejectDisposal`
   * to revert. Stock-of-record stays "active" while pending so a rejected
   * submission returns cleanly to in-service.
   */
  submitDisposal: async (input: SubmitDisposalInput): Promise<Asset> => {
    await delay(120)
    const asset = findAsset(input.assetId)
    if (asset.status === 'disposed') throw new Error('Asset is already disposed')
    if (asset.status === 'retiring') throw new Error('A disposal is already pending for this asset')

    asset.status = 'retiring'
    asset.disposal = {
      type: input.type,
      amount: input.amount,
      disposedTo: input.disposedTo,
      disposedDate: input.disposedDate,
      disposedBy: input.submittedBy,
      reason: input.reason,
    }

    emitEvent({
      assetId: asset.id,
      type: 'disposal_submitted',
      detail: `Disposal submitted: ${input.type}${input.amount ? ` (${input.amount})` : ''}${input.disposedTo ? ` to ${input.disposedTo}` : ''}`,
      actorName: input.submittedBy,
      payload: { disposalType: input.type, disposalAmount: input.amount },
    })
    // Audit records the approver assignment so a third party sees the routing.
    recordAudit({
      userId: input.submittedBy,
      action: 'update',
      module: 'Assets',
      detail: `Disposal submitted for ${asset.assetCode} — awaiting approval by ${input.approverName}`,
    })
    return asset
  },

  approveDisposal: async (assetId: string, approverName: string): Promise<Asset> => {
    await delay(120)
    const asset = findAsset(assetId)
    if (asset.status !== 'retiring' || !asset.disposal) {
      throw new Error('No pending disposal to approve')
    }
    const now = new Date().toISOString()
    asset.status = 'disposed'
    asset.condition = 'out_of_service'
    asset.assignedTo = undefined
    asset.disposal = {
      ...asset.disposal,
      approvedBy: approverName,
      approvedAt: now,
    }
    emitEvent({
      assetId: asset.id,
      type: 'disposal_approved',
      detail: `Disposal approved — ${asset.disposal.reason}`,
      actorName: approverName,
      payload: { disposalType: asset.disposal.type, disposalAmount: asset.disposal.amount },
    })
    recordAudit({
      userId: approverName,
      action: 'approve',
      module: 'Assets',
      detail: `Approved disposal of ${asset.assetCode} — ${asset.disposal.reason}`,
    })
    return asset
  },

  rejectDisposal: async (assetId: string, rejecterName: string, reason: string): Promise<Asset> => {
    await delay(120)
    const asset = findAsset(assetId)
    if (asset.status !== 'retiring') throw new Error('No pending disposal to reject')
    asset.status = 'active'
    const submittedReason = asset.disposal?.reason
    asset.disposal = undefined

    emitEvent({
      assetId: asset.id,
      type: 'disposal_rejected',
      detail: `Disposal rejected — ${reason}${submittedReason ? ` (was: ${submittedReason})` : ''}`,
      actorName: rejecterName,
      payload: { rejectionReason: reason },
    })
    recordAudit({
      userId: rejecterName,
      action: 'reject',
      module: 'Assets',
      detail: `Rejected disposal of ${asset.assetCode} — ${reason}`,
    })
    return asset
  },

  recordInspection: async (input: CreateInspectionInput): Promise<Inspection> => {
    await delay(140)
    findAsset(input.assetId) // throws if missing

    const failed = input.lines.some((l) => l.result === 'fail')
    const overall: InspectionResult = failed ? 'fail' : 'pass'
    const now = new Date().toISOString()

    const inspection: Inspection = {
      id: nextInspectionId(),
      assetId: input.assetId,
      checklistId: input.checklistId,
      inspectionDate: input.inspectionDate,
      inspector: input.inspector,
      status: input.submit ? 'submitted' : 'draft',
      lines: input.lines,
      overallResult: overall,
      notes: input.notes,
      createdAt: now,
      submittedAt: input.submit ? now : undefined,
    }
    mockInspections.push(inspection)

    if (input.submit) {
      const passCount = input.lines.filter((l) => l.result === 'pass').length
      emitEvent({
        assetId: input.assetId,
        type: 'inspection',
        detail: `${overall === 'pass' ? 'Inspection passed' : 'Inspection failed'} (${passCount}/${input.lines.length} items)`,
        actorName: input.inspector,
        payload: { inspectionId: inspection.id },
      })
      recordAudit({
        userId: input.inspector,
        action: 'create',
        module: 'Assets',
        detail: `Recorded inspection ${inspection.id} for asset ${input.assetId} — ${overall}`,
      })
    }
    return inspection
  },
}
