import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assetsApi } from '@/features/assets/api/assets-api'

export function useAssets() {
  return useQuery({ queryKey: ['assets', 'list'], queryFn: assetsApi.list })
}

export function useAssetAssignments() {
  return useQuery({ queryKey: ['assets', 'assignments'], queryFn: assetsApi.listAssignments })
}

function invalidateAssets(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['assets'] })
  qc.invalidateQueries({ queryKey: ['audit-log'] })
}

export function useAssignAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetsApi.assign,
    onSuccess: () => invalidateAssets(qc),
  })
}

export function useReturnAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetsApi.return,
    onSuccess: () => invalidateAssets(qc),
  })
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
