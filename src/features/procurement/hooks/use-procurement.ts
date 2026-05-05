import { useQuery } from '@tanstack/react-query'
import { procurementApi } from '@/features/procurement/api/procurement-api'

export function useRequests() {
  return useQuery({ queryKey: ['procurement', 'requests'], queryFn: procurementApi.list })
}

export function useRequestItems() {
  return useQuery({ queryKey: ['procurement', 'items'], queryFn: procurementApi.listItems })
}
