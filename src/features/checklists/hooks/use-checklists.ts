import { useQuery } from '@tanstack/react-query'
import { checklistsApi } from '@/features/checklists/api/checklists-api'

export function useTemplates() {
  return useQuery({ queryKey: ['checklists', 'templates'], queryFn: checklistsApi.listTemplates })
}

export function useAssignments() {
  return useQuery({ queryKey: ['checklists', 'assignments'], queryFn: checklistsApi.listAssignments })
}
