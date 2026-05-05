import { useQuery } from '@tanstack/react-query'
import { qmsApi } from '@/features/qms/api/qms-api'

export function useQmsTemplates() {
  return useQuery({ queryKey: ['qms', 'templates'], queryFn: qmsApi.listTemplates })
}

export function useQmsReports() {
  return useQuery({ queryKey: ['qms', 'reports'], queryFn: qmsApi.listReports })
}
