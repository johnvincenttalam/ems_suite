import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '@/features/documents/api/documents-api'

export function useDocuments() {
  return useQuery({ queryKey: ['documents'], queryFn: documentsApi.list })
}
