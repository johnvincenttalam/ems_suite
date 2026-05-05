import type { AuditEntry } from '@/features/audit-log/types'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

/**
 * Audit Log API — read-only. Swap with real HTTP when backend is ready:
 *   list:  (params?) => http.get<AuditEntry[]>('/audit-log', { search: params })
 */
export const auditLogApi = {
  list: async (): Promise<AuditEntry[]> => {
    await delay()
    return [...mockAuditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  },
}
