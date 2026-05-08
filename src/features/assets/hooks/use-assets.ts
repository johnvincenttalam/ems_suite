import { useQuery } from '@tanstack/react-query'
import { assetsApi } from '@/features/assets/api/assets-api'

export function useAssets() {
  return useQuery({ queryKey: ['assets', 'list'], queryFn: assetsApi.list })
}

export function useAssetAssignments() {
  return useQuery({ queryKey: ['assets', 'assignments'], queryFn: assetsApi.listAssignments })
}

export function useAssetEvents(assetId?: string) {
  return useQuery({
    queryKey: ['assets', 'events', assetId ?? 'all'],
    queryFn: () => assetsApi.listEvents(assetId),
  })
}

export function useAssetInspections(assetId?: string) {
  return useQuery({
    queryKey: ['assets', 'inspections', assetId ?? 'all'],
    queryFn: () => assetsApi.listInspections(assetId),
  })
}
