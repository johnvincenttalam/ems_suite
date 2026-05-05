import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/features/inventory/api/inventory-api'

export function useInventoryItems() {
  return useQuery({ queryKey: ['inventory', 'items'], queryFn: inventoryApi.listItems })
}

export function useStockMovements() {
  return useQuery({ queryKey: ['inventory', 'movements'], queryFn: inventoryApi.listMovements })
}
