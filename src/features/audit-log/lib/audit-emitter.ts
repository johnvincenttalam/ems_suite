import type { AuditAction, AuditEntry } from '@/features/audit-log/types'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'
import { mockUsers } from '@/features/users'

let counter = mockAuditLog.length

interface RecordAuditInput {
  userId: string
  action: AuditAction
  module: string
  detail: string
  /** Override timestamp (defaults to now). Useful for tests. */
  timestamp?: string
}

/**
 * Append an audit entry to the in-memory log. Looks up the user's display name
 * from `mockUsers`. Cross-module mutations (e.g. procurement.approve) call this
 * so every state change is reflected in `/module/admin/audit-log`.
 *
 * In a real backend this would POST to `/api/audit-log`; here it just unshifts
 * onto the mock array, which the React Query cache picks up after invalidation.
 */
export function recordAudit({ userId, action, module, detail, timestamp }: RecordAuditInput): AuditEntry {
  counter += 1
  const user = mockUsers.find((u) => u.id === userId)
  const entry: AuditEntry = {
    id: `A${String(counter).padStart(4, '0')}`,
    userId,
    userName: user?.name ?? 'Unknown',
    action,
    module,
    detail,
    timestamp: timestamp ?? new Date().toISOString(),
  }
  mockAuditLog.unshift(entry)
  return entry
}
