import { useQuery } from '@tanstack/react-query'
import { preventiveSchedulesApi } from '@/features/preventive-maintenance/api/preventive-schedules-api'

export function usePreventiveSchedules() {
  return useQuery({
    queryKey: ['preventive-schedules'],
    queryFn: preventiveSchedulesApi.list,
  })
}
