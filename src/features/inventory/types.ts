export type StockMovementType = 'in' | 'out' | 'transfer' | 'adjustment'

export interface InventoryItem {
  id: string
  sku: string
  name: string
  description?: string
  categoryId: string
  uomId: string
  warehouseId: string
  quantity: number
  reorderLevel: number
  unitCost?: number
  createdAt: string
}

export interface StockMovement {
  id: string
  itemId: string
  type: StockMovementType
  quantity: number
  sourceLocationId?: string
  destinationLocationId?: string
  reason?: string
  createdAt: string
  createdBy: string
}
