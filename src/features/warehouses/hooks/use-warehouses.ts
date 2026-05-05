import { useQuery } from '@tanstack/react-query'
import { warehousesApi } from '@/features/warehouses/api/warehouses-api'

export function useWarehouses() {
  return useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
}
