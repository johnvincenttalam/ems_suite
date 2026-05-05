import { useQuery } from '@tanstack/react-query'
import { departmentsApi } from '@/features/departments/api/departments-api'

export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list })
}
