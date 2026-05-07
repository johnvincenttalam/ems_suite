import { describe, it, expect } from 'vitest'
import { inventoryApi } from './api/inventory-api'
import { mockCategories } from '@/features/categories'
import { mockUom } from '@/features/uom'
import { mockWarehouses } from '@/features/warehouses'

describe('inventoryApi.listItems', () => {
  it('returns at least one item', async () => {
    const result = await inventoryApi.listItems()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every item references valid category, uom, and warehouse ids', async () => {
    const items = await inventoryApi.listItems()
    const catIds = new Set(mockCategories.map((c) => c.id))
    const uomIds = new Set(mockUom.map((u) => u.id))
    const whIds = new Set(mockWarehouses.map((w) => w.id))
    expect(items.every((i) => catIds.has(i.categoryId))).toBe(true)
    expect(items.every((i) => uomIds.has(i.uomId))).toBe(true)
    expect(items.every((i) => whIds.has(i.warehouseId))).toBe(true)
  })

  it('every item only references inventory-type categories', async () => {
    const items = await inventoryApi.listItems()
    const inventoryCatIds = new Set(mockCategories.filter((c) => c.type === 'inventory').map((c) => c.id))
    expect(items.every((i) => inventoryCatIds.has(i.categoryId))).toBe(true)
  })
})

describe('inventoryApi.listMovements', () => {
  it('returns movements newest-first', async () => {
    const result = await inventoryApi.listMovements()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].createdAt >= result[i].createdAt).toBe(true)
    }
  })

  it('every movement type is one of the supported kinds', async () => {
    const result = await inventoryApi.listMovements()
    const allowed = new Set(['in', 'out', 'transfer', 'adjustment'])
    expect(result.every((m) => allowed.has(m.type))).toBe(true)
  })

  it('transfers always include both source and destination', async () => {
    const result = await inventoryApi.listMovements()
    const transfers = result.filter((m) => m.type === 'transfer')
    expect(transfers.length).toBeGreaterThan(0)
    expect(transfers.every((m) => !!m.sourceLocationId && !!m.destinationLocationId)).toBe(true)
  })
})

describe('inventoryApi.addItem', () => {
  it('appends a new item with a generated INV-XXXX id and returns it', async () => {
    const before = (await inventoryApi.listItems()).length
    const created = await inventoryApi.addItem({
      sku: 'TEST-ADD-1',
      name: 'Test Add Item 1',
      categoryId: 'C005',
      uomId: 'U001',
      warehouseId: 'W001',
      quantity: 7,
      reorderLevel: 2,
      createdBy: 'Admin User',
    })

    expect(created.id).toMatch(/^INV-\d+$/)
    expect(created.sku).toBe('TEST-ADD-1')
    expect(created.quantity).toBe(7)

    const after = await inventoryApi.listItems()
    expect(after.length).toBe(before + 1)
    expect(after.some((i) => i.id === created.id)).toBe(true)
  })

  it('rejects duplicate SKU', async () => {
    const items = await inventoryApi.listItems()
    const existingSku = items[0].sku
    await expect(
      inventoryApi.addItem({
        sku: existingSku,
        name: 'Should fail',
        categoryId: 'C005',
        uomId: 'U001',
        warehouseId: 'W001',
        quantity: 1,
        reorderLevel: 0,
        createdBy: 'Admin User',
      }),
    ).rejects.toThrow(/already exists/)
  })
})

describe('inventoryApi.updateItem', () => {
  it('mutates the matched item and returns the updated record', async () => {
    const created = await inventoryApi.addItem({
      sku: 'TEST-UPD-1',
      name: 'Test Update Item',
      categoryId: 'C005',
      uomId: 'U001',
      warehouseId: 'W001',
      quantity: 10,
      reorderLevel: 2,
      createdBy: 'Admin User',
    })

    const updated = await inventoryApi.updateItem(created.id, {
      name: 'Renamed Item',
      reorderLevel: 5,
      updatedBy: 'Admin User',
    })

    expect(updated.name).toBe('Renamed Item')
    expect(updated.reorderLevel).toBe(5)
    expect(updated.sku).toBe('TEST-UPD-1')

    const fetched = (await inventoryApi.listItems()).find((i) => i.id === created.id)!
    expect(fetched.name).toBe('Renamed Item')
  })

  it('rejects an unknown id', async () => {
    await expect(
      inventoryApi.updateItem('INV-DOES-NOT-EXIST', { name: 'x', updatedBy: 'Admin User' }),
    ).rejects.toThrow(/not found/)
  })
})

describe('inventoryApi.deleteItem', () => {
  it('removes the item from listItems', async () => {
    const created = await inventoryApi.addItem({
      sku: 'TEST-DEL-1',
      name: 'Test Delete Item',
      categoryId: 'C005',
      uomId: 'U001',
      warehouseId: 'W001',
      quantity: 0,
      reorderLevel: 0,
      createdBy: 'Admin User',
    })

    await inventoryApi.deleteItem(created.id, 'Admin User')

    const after = await inventoryApi.listItems()
    expect(after.some((i) => i.id === created.id)).toBe(false)
  })

  it('rejects an unknown id', async () => {
    await expect(inventoryApi.deleteItem('INV-DOES-NOT-EXIST', 'Admin User')).rejects.toThrow(/not found/)
  })
})

describe('inventoryApi.addMovement', () => {
  it('appends a stock-in movement and increments the bound item quantity', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]
    const startingQty = target.quantity
    const movementsBefore = await inventoryApi.listMovements()

    const created = await inventoryApi.addMovement({
      itemId: target.id,
      type: 'in',
      quantity: 5,
      destinationLocationId: target.warehouseId,
      reason: 'unit test stock-in',
      createdBy: 'Admin User',
    })

    expect(created.id).toMatch(/^MV-/)
    expect(created.type).toBe('in')
    expect(created.quantity).toBe(5)

    const itemsAfter = await inventoryApi.listItems()
    const movementsAfter = await inventoryApi.listMovements()
    const targetAfter = itemsAfter.find((i) => i.id === target.id)!

    expect(movementsAfter.length).toBe(movementsBefore.length + 1)
    expect(targetAfter.quantity).toBe(startingQty + 5)
  })

  it('decrements the bound item quantity on stock-out', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]
    const startingQty = target.quantity

    await inventoryApi.addMovement({
      itemId: target.id,
      type: 'out',
      quantity: 2,
      sourceLocationId: target.warehouseId,
      reason: 'unit test stock-out',
      createdBy: 'Admin User',
    })

    const itemsAfter = await inventoryApi.listItems()
    const targetAfter = itemsAfter.find((i) => i.id === target.id)!
    expect(targetAfter.quantity).toBe(startingQty - 2)
  })

  it('leaves the bound item quantity unchanged on transfer (pending until approved)', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]
    const startingQty = target.quantity

    const m = await inventoryApi.addMovement({
      itemId: target.id,
      type: 'transfer',
      quantity: 3,
      sourceLocationId: 'W001',
      destinationLocationId: 'W002',
      reason: 'unit test transfer',
      createdBy: 'Admin User',
      approverId: 'Jane Doe',
    })

    expect(m.status).toBe('pending')

    const itemsAfter = await inventoryApi.listItems()
    const targetAfter = itemsAfter.find((i) => i.id === target.id)!
    expect(targetAfter.quantity).toBe(startingQty)
  })

  it('throws when transfer is submitted without an approver', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]
    await expect(
      inventoryApi.addMovement({
        itemId: target.id,
        type: 'transfer',
        quantity: 3,
        sourceLocationId: 'W001',
        destinationLocationId: 'W002',
        reason: 'unit test transfer no approver',
        createdBy: 'Admin User',
      }),
    ).rejects.toThrow(/approver/i)
  })
})

describe('inventoryApi.approveMovement / rejectMovement', () => {
  it('approving an adjustment posts the stock change and flips status to applied', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]
    const startingQty = target.quantity

    const submitted = await inventoryApi.addMovement({
      itemId: target.id,
      type: 'adjustment',
      quantity: -5,
      sourceLocationId: target.warehouseId,
      reason: 'unit test adjustment',
      createdBy: 'John Smith',
      approverId: 'Jane Doe',
    })
    expect(submitted.status).toBe('pending')

    const approved = await inventoryApi.approveMovement(submitted.id, 'Jane Doe')
    expect(approved.status).toBe('applied')
    expect(approved.approvedBy).toBe('Jane Doe')

    const itemsAfter = await inventoryApi.listItems()
    const targetAfter = itemsAfter.find((i) => i.id === target.id)!
    expect(targetAfter.quantity).toBe(startingQty - 5)
  })

  it('rejecting leaves stock unchanged and stamps the reason', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]
    const startingQty = target.quantity

    const submitted = await inventoryApi.addMovement({
      itemId: target.id,
      type: 'adjustment',
      quantity: -7,
      sourceLocationId: target.warehouseId,
      reason: 'unit test rejection',
      createdBy: 'John Smith',
      approverId: 'Jane Doe',
    })

    const rejected = await inventoryApi.rejectMovement(submitted.id, 'Variance too large', 'Jane Doe')
    expect(rejected.status).toBe('rejected')
    expect(rejected.rejectedReason).toBe('Variance too large')

    const itemsAfter = await inventoryApi.listItems()
    const targetAfter = itemsAfter.find((i) => i.id === target.id)!
    expect(targetAfter.quantity).toBe(startingQty)
  })

  it('throws when a non-approver tries to approve', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]

    const submitted = await inventoryApi.addMovement({
      itemId: target.id,
      type: 'transfer',
      quantity: 1,
      sourceLocationId: 'W001',
      destinationLocationId: 'W002',
      reason: 'wrong approver test',
      createdBy: 'John Smith',
      approverId: 'Jane Doe',
    })

    await expect(inventoryApi.approveMovement(submitted.id, 'Mike Thompson')).rejects.toThrow(/not the assigned approver/i)
  })

  it('throws when approving an already-applied movement', async () => {
    const itemsBefore = await inventoryApi.listItems()
    const target = itemsBefore[0]

    const submitted = await inventoryApi.addMovement({
      itemId: target.id,
      type: 'transfer',
      quantity: 1,
      sourceLocationId: 'W001',
      destinationLocationId: 'W002',
      reason: 'double approve test',
      createdBy: 'John Smith',
      approverId: 'Jane Doe',
    })

    await inventoryApi.approveMovement(submitted.id, 'Jane Doe')
    await expect(inventoryApi.approveMovement(submitted.id, 'Jane Doe')).rejects.toThrow(/not pending/i)
  })
})
