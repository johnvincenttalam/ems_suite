import type {
  Issue,
  IssueCreateInput,
  IssueListOptions,
  IssueStatus,
  IssueTarget,
  IssueComment,
  IssueSeverity,
} from '@/features/issues/types'
import { mockIssues } from '@/features/issues/data/mock-issues'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
import { mockVehicles } from '@/features/fleet/data/mock-fleet'
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api'
import type { WorkOrder } from '@/features/maintenance/types'
import { severityToWorkOrderPriority } from '@/features/issues/lib/derive-priority'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 250 + 120))

let counter = mockIssues.length
let commentCounter = mockIssues.reduce((s, i) => s + i.comments.length, 0)

function nextId(): string {
  counter += 1
  const year = new Date().getUTCFullYear()
  return `ISS-${year}-${String(counter).padStart(4, '0')}`
}

function nextCommentId(): string {
  commentCounter += 1
  return `IC-${String(commentCounter).padStart(3, '0')}`
}

function targetMatches(t: IssueTarget, filter: IssueTarget): boolean {
  return t.kind === filter.kind && t.id === filter.id
}

function describeTarget(t: IssueTarget): string {
  return `${t.kind}:${t.id}`
}

const OPEN_STATUSES = new Set<IssueStatus>(['open', 'monitor', 'in_progress'])

export class IssueValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IssueValidationError'
  }
}

/**
 * Issues API — swap with real HTTP when backend is ready:
 *   list:                () => http.get<Issue[]>('/issues', { params })
 *   create:              (body) => http.post<Issue>('/issues', body)
 *   createFromInspection:(body) => http.post<Issue[]>('/issues/from-inspection', body)
 *   setStatus:           (id, body) => http.post<Issue>(`/issues/${id}/status`, body)
 *   addComment:          (id, body) => http.post<Issue>(`/issues/${id}/comments`, body)
 */
export const issuesApi = {
  list: async (opts: IssueListOptions = {}): Promise<Issue[]> => {
    await delay()
    let rows = [...mockIssues]
    if (opts.targetKind) rows = rows.filter((i) => i.target.kind === opts.targetKind)
    if (opts.target) rows = rows.filter((i) => targetMatches(i.target, opts.target!))
    if (opts.severity) rows = rows.filter((i) => i.severity === opts.severity)
    if (opts.status === 'all-open') {
      rows = rows.filter((i) => OPEN_STATUSES.has(i.status))
    } else if (opts.status) {
      rows = rows.filter((i) => i.status === opts.status)
    }
    return rows.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
  },

  get: async (id: string): Promise<Issue | null> => {
    await delay()
    return mockIssues.find((i) => i.id === id) ?? null
  },

  create: async (input: IssueCreateInput): Promise<Issue> => {
    await delay()
    if (!input.title.trim()) throw new IssueValidationError('Title is required')
    const now = new Date().toISOString()
    const issue: Issue = {
      id: nextId(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      severity: input.severity,
      status: 'open',
      source: input.source,
      target: input.target,
      sourceChecklistRunId: input.sourceChecklistRunId,
      sourceChecklistItemKey: input.sourceChecklistItemKey,
      sourceWorkOrderId: input.sourceWorkOrderId,
      reportedByUserId: input.reportedByUserId,
      reportedAt: now,
      assignedToUserId: input.assignedToUserId,
      attachmentDocumentIds: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    }
    mockIssues.unshift(issue)
    recordAudit({
      userId: input.reportedByUserId,
      action: 'create',
      module: 'Issues',
      detail: `Reported ${input.severity} issue "${issue.title}" against ${describeTarget(input.target)}`,
    })
    return issue
  },

  /**
   * Create one Issue per failed inspection item. Returns the created issues
   * in the same order as the input items. Useful for the checklist → issue
   * auto-creation hook (Phase 2 wiring) and for batch-importing failed
   * inspection runs.
   */
  createFromInspection: async (params: {
    runId: string
    target: IssueTarget
    reportedByUserId: string
    failedItems: Array<{
      itemKey: string
      label: string
      severity?: IssueSeverity
      note?: string
    }>
  }): Promise<Issue[]> => {
    await delay()
    if (params.failedItems.length === 0) return []
    const created: Issue[] = []
    for (const failure of params.failedItems) {
      const issue = await issuesApi.create({
        title: failure.label,
        description: failure.note,
        severity: failure.severity ?? 'major',
        source: 'inspection',
        target: params.target,
        reportedByUserId: params.reportedByUserId,
        sourceChecklistRunId: params.runId,
        sourceChecklistItemKey: failure.itemKey,
      })
      created.push(issue)
    }
    return created
  },

  setStatus: async (params: {
    id: string
    status: IssueStatus
    actorUserId: string
    resolutionNotes?: string
  }): Promise<Issue> => {
    await delay()
    const issue = mockIssues.find((i) => i.id === params.id)
    if (!issue) throw new IssueValidationError(`Issue ${params.id} not found`)

    if (params.status === 'resolved') {
      if (issue.severity === 'critical' && !params.resolutionNotes?.trim()) {
        throw new IssueValidationError('Resolution notes are required for critical issues')
      }
    }

    if (params.status === 'closed' && issue.status !== 'resolved' && issue.status !== 'closed') {
      throw new IssueValidationError('Only resolved issues can be closed')
    }

    const now = new Date().toISOString()
    issue.status = params.status
    issue.updatedAt = now
    if (params.status === 'resolved') {
      issue.resolvedByUserId = params.actorUserId
      issue.resolvedAt = now
      if (params.resolutionNotes?.trim()) issue.resolutionNotes = params.resolutionNotes.trim()
    }

    recordAudit({
      userId: params.actorUserId,
      action: 'update',
      module: 'Issues',
      detail: `${params.status === 'resolved' ? 'Resolved' : params.status === 'closed' ? 'Closed' : `Set status to ${params.status} on`} "${issue.title}" (${issue.id})`,
    })
    return issue
  },

  assign: async (params: { id: string; assigneeUserId: string | null; actorUserId: string }): Promise<Issue> => {
    await delay()
    const issue = mockIssues.find((i) => i.id === params.id)
    if (!issue) throw new IssueValidationError(`Issue ${params.id} not found`)
    issue.assignedToUserId = params.assigneeUserId ?? undefined
    issue.updatedAt = new Date().toISOString()
    recordAudit({
      userId: params.actorUserId,
      action: 'update',
      module: 'Issues',
      detail: params.assigneeUserId
        ? `Assigned "${issue.title}" (${issue.id}) to user ${params.assigneeUserId}`
        : `Unassigned "${issue.title}" (${issue.id})`,
    })
    return issue
  },

  addComment: async (params: { id: string; authorUserId: string; body: string }): Promise<Issue> => {
    await delay()
    const issue = mockIssues.find((i) => i.id === params.id)
    if (!issue) throw new IssueValidationError(`Issue ${params.id} not found`)
    if (!params.body.trim()) throw new IssueValidationError('Comment body is required')
    const comment: IssueComment = {
      id: nextCommentId(),
      authorUserId: params.authorUserId,
      body: params.body.trim(),
      createdAt: new Date().toISOString(),
    }
    issue.comments.push(comment)
    issue.updatedAt = comment.createdAt
    return issue
  },

  findByWorkOrderId: async (workOrderId: string): Promise<Issue | null> => {
    await delay(80)
    return mockIssues.find((i) => i.workOrderId === workOrderId) ?? null
  },

  /**
   * Escalate an issue into a maintenance work order. Asset targets create an
   * asset-WO; vehicle targets create a vehicle-WO.
   */
  createWorkOrder: async (params: {
    issueId: string
    scheduledDate: string
    assigneeUserId: string
    actorUserId: string
  }): Promise<{ issue: Issue; workOrder: WorkOrder }> => {
    const issue = mockIssues.find((i) => i.id === params.issueId)
    if (!issue) throw new IssueValidationError(`Issue ${params.issueId} not found`)
    if (issue.status === 'resolved' || issue.status === 'closed') {
      throw new IssueValidationError(`Cannot escalate a ${issue.status} issue`)
    }
    if (issue.workOrderId) {
      throw new IssueValidationError(`Issue is already linked to ${issue.workOrderId}`)
    }
    if (!params.scheduledDate) throw new IssueValidationError('Scheduled date is required')
    if (!params.assigneeUserId) throw new IssueValidationError('Technician assignment is required')

    if (issue.target.kind === 'vehicle') {
      const vehicle = mockVehicles.find((v) => v.id === issue.target.id)
      if (!vehicle) {
        throw new IssueValidationError(`Vehicle ${issue.target.id} not found`)
      }
    }

    const wo = await maintenanceApi.create({
      title: `Issue ${issue.id}: ${issue.title}`,
      description: issue.description
        ? `${issue.description}\n\nEscalated from issue ${issue.id}.`
        : `Escalated from issue ${issue.id}.`,
      assetId: issue.target.kind === 'asset' ? issue.target.id : undefined,
      vehicleId: issue.target.kind === 'vehicle' ? issue.target.id : undefined,
      assignedTo: params.assigneeUserId,
      priority: severityToWorkOrderPriority(issue.severity),
      scheduledDate: params.scheduledDate,
      sourceIssueId: issue.id,
      createdBy: params.actorUserId,
    })

    const now = new Date().toISOString()
    issue.workOrderId = wo.id
    if (issue.status === 'open' || issue.status === 'monitor') {
      issue.status = 'in_progress'
    }
    issue.updatedAt = now

    recordAudit({
      userId: params.actorUserId,
      action: 'create',
      module: 'Issues',
      detail: `Escalated ${issue.id} to work order ${wo.id} on ${issue.target.kind} ${issue.target.id}`,
    })

    return { issue, workOrder: wo }
  },
}
