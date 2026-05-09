export type IssueStatus = 'open' | 'monitor' | 'in_progress' | 'resolved' | 'closed'
export type IssueSeverity = 'minor' | 'major' | 'critical'
export type IssueSource = 'inspection' | 'manual' | 'work_order'

export type IssueTargetKind = 'vehicle' | 'asset'

export type IssueTarget =
  | { kind: 'vehicle'; id: string }
  | { kind: 'asset'; id: string }

export interface IssueComment {
  id: string
  authorUserId: string
  body: string
  createdAt: string
}

export interface Issue {
  id: string
  title: string
  description?: string
  severity: IssueSeverity
  status: IssueStatus
  source: IssueSource
  target: IssueTarget

  sourceChecklistRunId?: string
  sourceChecklistItemKey?: string
  sourceWorkOrderId?: string

  workOrderId?: string

  reportedByUserId: string
  reportedAt: string
  assignedToUserId?: string

  resolvedByUserId?: string
  resolvedAt?: string
  resolutionNotes?: string

  /** SDMS document IDs attached to this issue (photos, supplier reports, etc.). */
  attachmentDocumentIds: string[]

  comments: IssueComment[]

  createdAt: string
  updatedAt: string
}

export interface IssueCreateInput {
  title: string
  description?: string
  severity: IssueSeverity
  source: IssueSource
  target: IssueTarget
  reportedByUserId: string
  assignedToUserId?: string
  sourceChecklistRunId?: string
  sourceChecklistItemKey?: string
  sourceWorkOrderId?: string
}

export interface IssueListOptions {
  /** Filter by target kind (e.g. only vehicle issues for the Fleet workspace). */
  targetKind?: IssueTargetKind
  /** Filter to a specific target (e.g. issues for a single vehicle/asset). */
  target?: IssueTarget
  status?: IssueStatus | 'all-open'
  severity?: IssueSeverity
}
