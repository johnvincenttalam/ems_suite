import type { InventoryItem, StockMovement, StockMovementType } from '@/features/inventory/types'
import { mockInventoryItems, mockStockMovements } from '@/features/inventory/data/mock-inventory'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

let movementCounter = mockStockMovements.length

interface AddMovementInput {
  itemId: string
  type: StockMovementType
  quantity: number
  sourceLocationId?: string
  destinationLocationId?: string
  reason?: string
  createdBy: string
}

interface AddItemInput {
  sku: string
  name: string
  description?: string
  categoryId: string
  uomId: string
  warehouseId: string
  quantity: number
  reorderLevel: number
  unitCost?: number
  createdBy: string
}

interface UpdateItemInput {
  sku?: string
  name?: string
  description?: string
  categoryId?: string
  uomId?: string
  warehouseId?: string
  quantity?: number
  reorderLevel?: number
  unitCost?: number
  updatedBy: string
}

function nextItemId(): string {
  const maxNum = mockInventoryItems.reduce((max, i) => {
    const n = Number(i.id.replace(/^INV-/, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 1000)
  return `INV-${maxNum + 1}`
}

/**
 * Inventory API — swap with real HTTP when backend is ready:
 *   listItems:    () => http.get<InventoryItem[]>('/inventory/items')
 *   addItem:      (body) => http.post<InventoryItem>('/inventory/items', body)
 *   updateItem:   (id, body) => http.patch<InventoryItem>(`/inventory/items/${id}`, body)
 *   deleteItem:   (id) => http.delete(`/inventory/items/${id}`)
 *   listMovements: () => http.get<StockMovement[]>('/inventory/movements')
 *   addMovement:  (body) => http.post<StockMovement>('/inventory/movements', body)
 */
export const inventoryApi = {
  listItems: async (): Promise<InventoryItem[]> => {
    await delay()
    return mockInventoryItems
  },

  addItem: async (input: AddItemInput): Promise<InventoryItem> => {
    if (mockInventoryItems.some((i) => i.sku === input.sku)) {
      throw new Error(`SKU "${input.sku}" already exists`)
    }
    const item: InventoryItem = {
      id: nextItemId(),
      sku: input.sku,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      uomId: input.uomId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
      reorderLevel: input.reorderLevel,
      unitCost: input.unitCost,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockInventoryItems.push(item)

    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Inventory',
      detail: `Added item ${item.sku} — ${item.name} (qty ${item.quantity})`,
    })

    return item
  },

  updateItem: async (id: string, input: UpdateItemInput): Promise<InventoryItem> => {
    const idx = mockInventoryItems.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item ${id} not found`)

    if (input.sku && input.sku !== mockInventoryItems[idx].sku) {
      if (mockInventoryItems.some((i) => i.id !== id && i.sku === input.sku)) {
        throw new Error(`SKU "${input.sku}" already exists`)
      }
    }

    const existing = mockInventoryItems[idx]
    const { updatedBy, ...patch } = input
    const updated: InventoryItem = {
      ...existing,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockInventoryItems[idx] = updated

    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Inventory',
      detail: `Updated item ${updated.sku} — ${updated.name}`,
    })

    return updated
  },

  deleteItem: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockInventoryItems.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item ${id} not found`)
    const removed = mockInventoryItems[idx]
    mockInventoryItems.splice(idx, 1)

    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Inventory',
      detail: `Deleted item ${removed.sku} — ${removed.name}`,
    })
  },

  listMovements: async (): Promise<StockMovement[]> => {
    await delay()
    return [...mockStockMovements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /**
   * Records a stock movement and updates the bound item's `quantity`.
   * Emits an audit log entry. Used by procurement.approve to close the
   * Request → Approve → Stock In loop from the EMS spec.
   */
  addMovement: async (input: AddMovementInput): Promise<StockMovement> => {
    movementCounter += 1
    const movement: StockMovement = {
      id: `MV-${String(movementCounter).padStart(4, '0')}`,
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: input.destinationLocationId,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
    }
    mockStockMovements.unshift(movement)

    const item = mockInventoryItems.find((i) => i.id === movement.itemId)
    if (item) {
      if (movement.type === 'in') item.quantity += movement.quantity
      else if (movement.type === 'out') item.quantity -= movement.quantity
      else if (movement.type === 'adjustment') item.quantity += movement.quantity
    }

    recordAudit({
      userId: input.createdBy,
      action: movement.type === 'adjustment' ? 'update' : 'create',
      module: 'Inventory',
      detail: `${movement.type === 'in' ? 'Stock in' : movement.type === 'out' ? 'Stock out' : movement.type === 'transfer' ? 'Transfer' : 'Adjustment'} ${movement.quantity > 0 ? '+' : ''}${movement.quantity} of ${item?.name ?? movement.itemId}${input.reason ? ` — ${input.reason}` : ''}`,
    })

    return movement
  },
}
