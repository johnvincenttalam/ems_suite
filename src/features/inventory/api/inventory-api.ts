import type { InventoryItem, StockMovement, StockMovementType } from '@/features/inventory/types'
import { mockInventoryItems, mockStockMovements } from '@/features/inventory/data/mock-inventory'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
import { useInventorySettings } from '@/features/inventory/store/inventory-settings-store'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

// Seed from the highest existing MV-XXXX in mock data so synthetic IDs don't
// collide with existing seed records (MV-2xxx range).
let movementCounter = mockStockMovements.reduce((max, m) => {
  const n = Number(m.id.replace(/^MV-/, ''))
  return Number.isFinite(n) && n > max ? n : max
}, 0)

/** Reserve the next sequential movement ID. Shared with cycle-count-api so all
 * movements use a single MV-XXXX namespace. */
export function nextMovementId(): string {
  movementCounter += 1
  return `MV-${String(movementCounter).padStart(4, '0')}`
}

interface AddMovementInput {
  itemId: string
  type: StockMovementType
  quantity: number
  sourceLocationId?: string
  destinationLocationId?: string
  reason?: string
  createdBy: string
  /** Required for transfer/adjustment — the approver picked at submission. */
  approverId?: string
  batchNumber?: string
  referenceNumber?: string
  /** Adjustments only. Captures the user's intended on-hand target so the
   * applied delta can be recomputed against live stock at approve time. */
  targetQuantity?: number
}

/**
 * Apply a movement's stock change to the bound item. Centralizes the
 * arithmetic so addMovement (in/out) and approveMovement (transfer/
 * adjustment) stay in sync.
 *
 * - in:         destination += qty
 * - out:        source -= qty
 * - transfer:   source -= qty, destination += qty
 * - adjustment: source += qty (positive replenishes, negative removes)
 */
function applyStockChange(movement: StockMovement): void {
  const item = mockInventoryItems.find((i) => i.id === movement.itemId)
  if (!item) return
  if (movement.type === 'in') {
    item.quantity += movement.quantity
  } else if (movement.type === 'out') {
    item.quantity -= movement.quantity
  } else if (movement.type === 'transfer') {
    // Both source and destination resolve to warehouses; for the demo we
    // track stock on the item itself, so a transfer is net-zero on the
    // item's quantity but still posted for audit. A future per-warehouse
    // stock model would split this into two-sided ledger lines.
  } else if (movement.type === 'adjustment') {
    item.quantity += movement.quantity
  }
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
   * Records a stock movement.
   *
   * In/out movements apply immediately and start as 'applied'. Transfers
   * and adjustments require approval — they start as 'pending' with no
   * stock change posted. The approver runs `approveMovement` to apply, or
   * `rejectMovement` to decline.
   *
   * Used by procurement.approve to close the Request → Approve → Stock In
   * loop from the EMS spec (procurement passes type='in').
   */
  addMovement: async (input: AddMovementInput): Promise<StockMovement> => {
    const requiresApproval = input.type === 'transfer' || input.type === 'adjustment'
    if (requiresApproval && !input.approverId) {
      throw new Error(`${input.type === 'transfer' ? 'Transfer' : 'Adjustment'} requires an approver`)
    }
    // Block stock-out movements that would push the item below zero unless
    // the operator has explicitly opted in via Settings → System Preferences.
    if (input.type === 'out') {
      const settings = useInventorySettings.getState().settings
      if (!settings.allowNegativeStock) {
        const item = mockInventoryItems.find((i) => i.id === input.itemId)
        if (item && input.quantity > item.quantity) {
          throw new Error(
            `Cannot stock-out ${input.quantity} of ${item.name} — only ${item.quantity} on hand. ` +
            `Enable "Allow negative stock" in Settings to override.`,
          )
        }
      }
    }
    // ID is reserved only after all validation passes, so failed submissions
    // don't leave gaps in the sequence.
    const movement: StockMovement = {
      id: nextMovementId(),
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: input.destinationLocationId,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      status: requiresApproval ? 'pending' : 'applied',
      approverId: requiresApproval ? input.approverId : undefined,
      batchNumber: input.batchNumber,
      referenceNumber: input.referenceNumber,
      targetQuantity: input.type === 'adjustment' ? input.targetQuantity : undefined,
    }
    mockStockMovements.unshift(movement)

    if (!requiresApproval) {
      applyStockChange(movement)
    }

    const item = mockInventoryItems.find((i) => i.id === movement.itemId)
    const verb =
      movement.type === 'in' ? 'Stock in'
      : movement.type === 'out' ? 'Stock out'
      : movement.type === 'transfer' ? 'Submitted transfer'
      : 'Submitted adjustment'
    recordAudit({
      userId: input.createdBy,
      action: requiresApproval ? 'update' : 'create',
      module: 'Inventory',
      detail: `${verb} ${movement.quantity > 0 ? '+' : ''}${movement.quantity} of ${item?.name ?? movement.itemId}${input.reason ? ` — ${input.reason}` : ''}`,
    })

    return movement
  },

  /**
   * Approve a pending transfer or adjustment. Posts the stock change and
   * flips status to 'applied'. Throws if the movement isn't pending, the
   * acting user isn't the named approver, or the resulting stock would go
   * negative without `allowNegativeStock`.
   *
   * For adjustments, the delta is recomputed at approve time against the
   * live item.quantity using the originally-captured targetQuantity, so
   * intervening movements don't displace the user's target.
   */
  approveMovement: async (movementId: string, approverName: string): Promise<StockMovement> => {
    await delay(120)
    const m = mockStockMovements.find((x) => x.id === movementId)
    if (!m) throw new Error(`Movement ${movementId} not found`)
    if (m.status !== 'pending') throw new Error(`Movement ${movementId} is not pending`)
    if (m.approverId && m.approverId !== approverName) {
      throw new Error(`${approverName} is not the assigned approver`)
    }

    if (m.type === 'adjustment' && m.targetQuantity !== undefined) {
      const item = mockInventoryItems.find((i) => i.id === m.itemId)
      if (item) m.quantity = m.targetQuantity - item.quantity
    }

    if (m.type === 'adjustment') {
      const item = mockInventoryItems.find((i) => i.id === m.itemId)
      const settings = useInventorySettings.getState().settings
      if (item && !settings.allowNegativeStock && item.quantity + m.quantity < 0) {
        throw new Error(
          `Approval would push ${item.name} below zero (${item.quantity} + ${m.quantity}). ` +
          `Enable "Allow negative stock" in Settings to override.`,
        )
      }
    }

    m.status = 'applied'
    m.approvedBy = approverName
    m.approvedAt = new Date().toISOString()
    applyStockChange(m)

    const item = mockInventoryItems.find((i) => i.id === m.itemId)
    recordAudit({
      userId: approverName,
      action: 'approve',
      module: 'Inventory',
      detail: `Approved ${m.type} ${m.quantity > 0 ? '+' : ''}${m.quantity} of ${item?.name ?? m.itemId}${m.reason ? ` — ${m.reason}` : ''}`,
    })

    return m
  },

  /**
   * Reject a pending transfer or adjustment. Status flips to 'rejected'
   * and the stock change is never posted. The reason is stored for audit.
   */
  rejectMovement: async (movementId: string, reason: string, rejecterName: string): Promise<StockMovement> => {
    await delay(120)
    const m = mockStockMovements.find((x) => x.id === movementId)
    if (!m) throw new Error(`Movement ${movementId} not found`)
    if (m.status !== 'pending') throw new Error(`Movement ${movementId} is not pending`)
    if (m.approverId && m.approverId !== rejecterName) {
      throw new Error(`${rejecterName} is not the assigned approver`)
    }
    m.status = 'rejected'
    m.rejectedBy = rejecterName
    m.rejectedAt = new Date().toISOString()
    m.rejectedReason = reason

    const item = mockInventoryItems.find((i) => i.id === m.itemId)
    recordAudit({
      userId: rejecterName,
      action: 'reject',
      module: 'Inventory',
      detail: `Rejected ${m.type} ${m.quantity > 0 ? '+' : ''}${m.quantity} of ${item?.name ?? m.itemId} — ${reason}`,
    })

    return m
  },
}
