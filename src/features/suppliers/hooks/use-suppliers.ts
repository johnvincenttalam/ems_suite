import { useQuery } from '@tanstack/react-query'
import { suppliersApi } from '@/features/suppliers/api/suppliers-api'

export function useSuppliers() {
  return useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list })
}
