import { useQuery } from '@tanstack/react-query'
import { maintenanceApi } from '@/features/maintenance/api/maintenance-api'

export function useWorkOrders() {
  return useQuery({ queryKey: ['maintenance', 'work-orders'], queryFn: maintenanceApi.list })
}
