import type { IssueSeverity, IssueTarget } from '@/features/issues/types'

interface ChecklistFailure {
  itemKey: string
  label: string
  required: boolean
  note?: string
}

interface DerivedIssueInput {
  itemKey: string
  label: string
  severity: IssueSeverity
  note?: string
}

/**
 * Translates the failed items from an inspection run into Issue create inputs.
 * Required items default to 'major' severity; optional items default to 'minor'.
 * The caller layers in run/target context. Pure — no API calls — so it can be
 * tested in isolation and reused by future automation.
 */
export function deriveIssueInputsFromFailures(failures: ChecklistFailure[]): DerivedIssueInput[] {
  return failures.map((f) => ({
    itemKey: f.itemKey,
    label: f.label,
    severity: f.required ? 'major' : 'minor',
    note: f.note,
  }))
}

export type { ChecklistFailure, DerivedIssueInput, IssueTarget }
