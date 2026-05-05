import { describe, it, expect } from 'vitest'
import { deriveInventoryNotifications } from './derive-inventory'
import type { InventoryItem } from '@/features/inventory'

function item(p: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'INV-X',
    sku: 'SKU-X',
    name: 'Item',
    categoryId: 'C1',
    uomId: 'U1',
    warehouseId: 'W1',
    quantity: 100,
    reorderLevel: 10,
    createdAt: '2026-01-01',
    ...p,
  }
}

describe('deriveInventoryNotifications', () => {
  it('emits stock_out for zero-quantity items', () => {
    const items = [item({ id: 'A', quantity: 0, reorderLevel: 5 })]
    const notifs = deriveInventoryNotifications(items, 'U001')
    expect(notifs.some((n) => n.kind === 'stock_out' && n.id === 'inv-out:A')).toBe(true)
    expect(notifs[0].severity).toBe('danger')
  })

  it('emits low_stock when quantity is at or below reorder level', () => {
    const items = [
      item({ id: 'A', quantity: 5, reorderLevel: 10 }),
      item({ id: 'B', quantity: 10, reorderLevel: 10 }),
      item({ id: 'C', quantity: 11, reorderLevel: 10 }),
    ]
    const notifs = deriveInventoryNotifications(items, 'U001')
    const lowIds = notifs.filter((n) => n.kind === 'low_stock').map((n) => n.id)
    expect(lowIds.sort()).toEqual(['inv-low:A', 'inv-low:B'])
  })

  it('uses warning severity when ratio ≤ 0.5, info otherwise', () => {
    const items = [
      item({ id: 'A', quantity: 5, reorderLevel: 10 }),  // ratio 0.5 -> warning
      item({ id: 'B', quantity: 9, reorderLevel: 10 }),  // ratio 0.9 -> info
    ]
    const notifs = deriveInventoryNotifications(items, 'U001')
    expect(notifs.find((n) => n.id === 'inv-low:A')?.severity).toBe('warning')
    expect(notifs.find((n) => n.id === 'inv-low:B')?.severity).toBe('info')
  })

  it('does not emit for items above reorder level', () => {
    const items = [item({ id: 'A', quantity: 100, reorderLevel: 10 })]
    expect(deriveInventoryNotifications(items, 'U001')).toEqual([])
  })

  it('puts stock_out before low_stock in the sort order', () => {
    const items = [
      item({ id: 'A', quantity: 5, reorderLevel: 10 }),
      item({ id: 'B', quantity: 0, reorderLevel: 10 }),
    ]
    const notifs = deriveInventoryNotifications(items, 'U001')
    expect(notifs[0].kind).toBe('stock_out')
    expect(notifs[1].kind).toBe('low_stock')
  })

  it('caps the output to prevent flooding the bell', () => {
    const items = Array.from({ length: 30 }, (_, i) =>
      item({ id: `INV-${i}`, sku: `SKU-${i}`, quantity: 0, reorderLevel: 10 }),
    )
    const notifs = deriveInventoryNotifications(items, 'U001')
    expect(notifs.length).toBe(5)
  })
})
