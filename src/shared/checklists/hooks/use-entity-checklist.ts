import { useMemo } from 'react'
import { useTemplates, useAssignments } from '@/features/checklists'
import type { ChecklistTemplate, ChecklistAssignment } from '@/features/checklists'

export interface EntityChecklistResult {
  isLoading: boolean
  template?: ChecklistTemplate
  /** Best-match assignment: most recent for (templateId, assignedTo) tuple. */
  latestAssignment?: ChecklistAssignment
}

/**
 * Resolve a checklist template + best-match assignment for an owning entity.
 *
 * Pulls from the cross-cutting checklists feature so any owning module (maintenance,
 * fleet, assets, sdms) can render an inspection panel without re-querying.
 *
 * `assignedToUserId` lets the panel surface a relevant prior completion when the
 * owning entity tracks an assignee (work order technician, trip driver, etc.).
 * If omitted, only template metadata is returned.
 */
export function useEntityChecklist(
  templateId: string | undefined,
  assignedToUserId?: string,
): EntityChecklistResult {
  const { data: templates = [], isLoading: templatesLoading } = useTemplates()
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments()

  return useMemo(() => {
    if (!templateId) {
      return { isLoading: templatesLoading || assignmentsLoading }
    }
    const template = templates.find((t) => t.id === templateId)
    const candidates = assignments
      .filter((a) => a.templateId === templateId)
      .filter((a) => !assignedToUserId || a.assignedTo === assignedToUserId)
      .sort((a, b) => b.assignedDate.localeCompare(a.assignedDate))
    return {
      isLoading: templatesLoading || assignmentsLoading,
      template,
      latestAssignment: candidates[0],
    }
  }, [templateId, assignedToUserId, templates, assignments, templatesLoading, assignmentsLoading])
}
