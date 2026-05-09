import type { IssueSeverity } from '@/features/issues/types'

/**
 * Maps issue severity onto the maintenance module's WorkOrderPriority scale.
 * Used by the Phase 2 "Create Work Order from Issue" flow to pre-fill the
 * priority field. Kept as a pure function so the maintenance module stays
 * the source of truth for its own priority enum.
 */
export function severityToWorkOrderPriority(severity: IssueSeverity): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity) {
    case 'minor':
      return 'low'
    case 'major':
      return 'high'
    case 'critical':
      return 'critical'
  }
}
