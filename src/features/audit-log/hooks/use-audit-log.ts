import { useQuery } from '@tanstack/react-query'
import { auditLogApi } from '@/features/audit-log/api/audit-log-api'

export function useAuditLog() {
  return useQuery({ queryKey: ['audit-log'], queryFn: auditLogApi.list })
}
