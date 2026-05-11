import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { procurementApi } from '@/features/procurement/api/procurement-api'

export function useRequests() {
  return useQuery({ queryKey: ['procurement', 'requests'], queryFn: procurementApi.list })
}

export function useRequestItems() {
  return useQuery({ queryKey: ['procurement', 'items'], queryFn: procurementApi.listItems })
}

export function useUpdateRequestMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, patch, editorId }: { requestId: string; patch: { notes?: string; neededBy?: string }; editorId: string }) =>
      procurementApi.updateMeta(requestId, patch, editorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement'] })
      qc.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })
}

export function useCancelRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, reason, cancellerId }: { requestId: string; reason: string; cancellerId: string }) =>
      procurementApi.cancel(requestId, reason, cancellerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement'] })
      qc.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })
}
