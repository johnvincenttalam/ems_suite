import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { issuesApi } from '@/features/issues/api/issues-api'
import type {
  IssueCreateInput,
  IssueListOptions,
  IssueStatus,
  IssueTarget,
  IssueSeverity,
} from '@/features/issues/types'

export function useIssues(opts: IssueListOptions = {}) {
  return useQuery({
    queryKey: ['issues', 'list', opts],
    queryFn: () => issuesApi.list(opts),
  })
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: ['issues', 'detail', id],
    queryFn: () => issuesApi.get(id!),
    enabled: !!id,
  })
}

export function useIssuesForTarget(target: IssueTarget | null) {
  return useQuery({
    queryKey: ['issues', 'by-target', target?.kind, target?.id],
    queryFn: () => issuesApi.list({ target: target! }),
    enabled: !!target,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['issues'] })
  qc.invalidateQueries({ queryKey: ['audit-log'] })
}

export function useCreateIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IssueCreateInput) => issuesApi.create(input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateIssuesFromInspection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      runId: string
      target: IssueTarget
      reportedByUserId: string
      failedItems: Array<{ itemKey: string; label: string; severity?: IssueSeverity; note?: string }>
    }) => issuesApi.createFromInspection(input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useSetIssueStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: IssueStatus; actorUserId: string; resolutionNotes?: string }) =>
      issuesApi.setStatus(input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useAddIssueComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; authorUserId: string; body: string }) => issuesApi.addComment(input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useAssignIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; assigneeUserId: string | null; actorUserId: string }) =>
      issuesApi.assign(input),
    onSuccess: () => invalidateAll(qc),
  })
}
