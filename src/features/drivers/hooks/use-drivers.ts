import { useQuery } from '@tanstack/react-query'
import { driversApi } from '@/features/drivers/api/drivers-api'

export function useDrivers() {
  return useQuery({ queryKey: ['drivers'], queryFn: driversApi.list })
}
