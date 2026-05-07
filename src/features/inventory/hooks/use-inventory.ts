import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/features/inventory/api/inventory-api'
import { cycleCountApi } from '@/features/inventory/api/cycle-count-api'

export function useInventoryItems() {
  return useQuery({ queryKey: ['inventory', 'items'], queryFn: inventoryApi.listItems })
}

export function useStockMovements() {
  return useQuery({ queryKey: ['inventory', 'movements'], queryFn: inventoryApi.listMovements })
}

export function useCycleCountSessions() {
  return useQuery({ queryKey: ['inventory', 'cycle-counts'], queryFn: cycleCountApi.list })
}
