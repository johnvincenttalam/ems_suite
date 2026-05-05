import { useQuery } from '@tanstack/react-query'
import { trackingApi } from '@/features/tracking/api/tracking-api'

export function useTags() {
  return useQuery({ queryKey: ['tracking', 'tags'], queryFn: trackingApi.listTags })
}

export function useTrackingLogs() {
  return useQuery({ queryKey: ['tracking', 'logs'], queryFn: trackingApi.listLogs })
}
