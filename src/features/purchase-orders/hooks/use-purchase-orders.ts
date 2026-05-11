import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi } from '@/features/purchase-orders/api/purchase-orders-api'

export function usePurchaseOrders() {
  return useQuery({ queryKey: ['purchase-orders', 'list'], queryFn: purchaseOrdersApi.list })
}

export function usePOItems() {
  return useQuery({ queryKey: ['purchase-orders', 'items'], queryFn: purchaseOrdersApi.listItems })
}

export function usePurchaseOrdersForRequisition(requisitionId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-orders', 'by-requisition', requisitionId ?? ''],
    queryFn: () => purchaseOrdersApi.listForRequisition(requisitionId!),
    enabled: !!requisitionId,
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['purchase-orders'] })
  qc.invalidateQueries({ queryKey: ['audit-log'] })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: purchaseOrdersApi.create,
    onSuccess: () => invalidate(qc),
  })
}

export function useSendPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, actorId }: { id: string; actorId: string }) => purchaseOrdersApi.send(id, actorId),
    onSuccess: () => invalidate(qc),
  })
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, actorId }: { id: string; reason: string; actorId: string }) =>
      purchaseOrdersApi.cancel(id, reason, actorId),
    onSuccess: () => invalidate(qc),
  })
}
