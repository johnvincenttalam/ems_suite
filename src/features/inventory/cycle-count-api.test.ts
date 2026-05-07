import { describe, it, expect } from 'vitest'
import { cycleCountApi } from './api/cycle-count-api'
import { inventoryApi } from './api/inventory-api'

describe('cycleCountApi.scheduleSession', () => {
  it('creates a scheduled session covering items in the warehouse', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-01',
      createdBy: 'Jane Doe',
    })
    expect(session.status).toBe('scheduled')
    expect(session.warehouseId).toBe('W001')
    expect(session.lines.length).toBeGreaterThan(0)
    expect(session.lines.every((l) => l.actualQty === undefined)).toBe(true)
  })

  it('scopes lines to a category when provided', async () => {
    const items = await inventoryApi.listItems()
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      categoryId: 'C005',
      scheduledDate: '2026-06-02',
      createdBy: 'Jane Doe',
    })
    const expected = items.filter((i) => i.warehouseId === 'W001' && i.categoryId === 'C005').length
    expect(session.lines.length).toBe(expected)
  })

  it('throws when no items match the filter', async () => {
    await expect(
      cycleCountApi.scheduleSession({
        warehouseId: 'W001',
        categoryId: 'NONEXISTENT',
        scheduledDate: '2026-06-03',
        createdBy: 'Jane Doe',
      }),
    ).rejects.toThrow(/no items match/i)
  })
})

describe('cycleCountApi.startSession / recordCount', () => {
  it('startSession transitions scheduled → in_progress', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W002',
      scheduledDate: '2026-06-04',
      createdBy: 'Jane Doe',
    })
    const started = await cycleCountApi.startSession(session.id, 'Jane Doe')
    expect(started.status).toBe('in_progress')
    expect(started.startedAt).toBeTruthy()
  })

  it('startSession throws when session is already in_progress', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W002',
      scheduledDate: '2026-06-05',
      createdBy: 'Jane Doe',
    })
    await cycleCountApi.startSession(session.id, 'Jane Doe')
    await expect(cycleCountApi.startSession(session.id, 'Jane Doe')).rejects.toThrow(/not scheduled/i)
  })

  it('recordCount auto-promotes scheduled to in_progress on first count', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W002',
      scheduledDate: '2026-06-06',
      createdBy: 'Jane Doe',
    })
    const target = session.lines[0]
    const updated = await cycleCountApi.recordCount(session.id, target.itemId, target.expectedQty, 'John Smith')
    expect(updated.status).toBe('in_progress')
    const line = updated.lines.find((l) => l.itemId === target.itemId)!
    expect(line.actualQty).toBe(target.expectedQty)
    expect(line.countedBy).toBe('John Smith')
  })

  it('recordCount throws for items not in the session', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-07',
      createdBy: 'Jane Doe',
    })
    await expect(
      cycleCountApi.recordCount(session.id, 'INV-NONEXISTENT', 5, 'John Smith'),
    ).rejects.toThrow(/not in session/i)
  })
})

describe('cycleCountApi.finalizeSession', () => {
  it('applies variance against LIVE stock — reconciles the book to the count', async () => {
    // Schedule a session capturing a snapshot of expectedQty at this moment.
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-10',
      createdBy: 'Jane Doe',
    })
    const target = session.lines[0]
    const startingQty = target.expectedQty

    // Simulate a stock-out movement happening AFTER the snapshot.
    await inventoryApi.addMovement({
      itemId: target.itemId,
      type: 'out',
      quantity: 2,
      sourceLocationId: 'W001',
      reason: 'simulating concurrent issue',
      createdBy: 'John Smith',
    })

    // Counter records what they actually see on the shelf — equal to the
    // post-movement quantity. Variance against the snapshot would be -2;
    // variance against live stock should be 0.
    const liveQty = startingQty - 2
    await cycleCountApi.recordCount(session.id, target.itemId, liveQty, 'John Smith')

    await cycleCountApi.finalizeSession(session.id, 'Jane Doe')

    const items = await inventoryApi.listItems()
    const after = items.find((i) => i.id === target.itemId)!
    // Book should match the physical count, not snapshot - 2 - 2 = startingQty - 4.
    expect(after.quantity).toBe(liveQty)
  })

  it('skips lines with zero variance and posts only differences', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-11',
      createdBy: 'Jane Doe',
    })
    // Record every line at exactly the current quantity → zero variance everywhere.
    for (const line of session.lines) {
      await cycleCountApi.recordCount(session.id, line.itemId, line.expectedQty, 'John Smith')
    }

    const movementsBefore = (await inventoryApi.listMovements()).length
    const finalized = await cycleCountApi.finalizeSession(session.id, 'Jane Doe')
    const movementsAfter = (await inventoryApi.listMovements()).length

    expect(finalized.status).toBe('completed')
    expect(movementsAfter).toBe(movementsBefore)
  })

  it('throws when no lines have been counted', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-12',
      createdBy: 'Jane Doe',
    })
    await expect(cycleCountApi.finalizeSession(session.id, 'Jane Doe')).rejects.toThrow(/no lines/i)
  })

  it('throws when session is already completed', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-13',
      createdBy: 'Jane Doe',
    })
    const target = session.lines[0]
    await cycleCountApi.recordCount(session.id, target.itemId, target.expectedQty, 'John Smith')
    await cycleCountApi.finalizeSession(session.id, 'Jane Doe')
    await expect(cycleCountApi.finalizeSession(session.id, 'Jane Doe')).rejects.toThrow(/already completed/i)
  })
})

describe('cycleCountApi.cancelSession', () => {
  it('transitions to cancelled without applying adjustments', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-14',
      createdBy: 'Jane Doe',
    })
    const target = session.lines[0]
    const startingQty = target.expectedQty
    // Record an obviously different value — should be ignored on cancel.
    await cycleCountApi.recordCount(session.id, target.itemId, startingQty + 99, 'John Smith')

    const cancelled = await cycleCountApi.cancelSession(session.id, 'Jane Doe', 'rescheduled')
    expect(cancelled.status).toBe('cancelled')

    const items = await inventoryApi.listItems()
    const after = items.find((i) => i.id === target.itemId)!
    expect(after.quantity).toBe(startingQty)
  })

  it('throws when session is already completed', async () => {
    const session = await cycleCountApi.scheduleSession({
      warehouseId: 'W001',
      scheduledDate: '2026-06-15',
      createdBy: 'Jane Doe',
    })
    const target = session.lines[0]
    await cycleCountApi.recordCount(session.id, target.itemId, target.expectedQty, 'John Smith')
    await cycleCountApi.finalizeSession(session.id, 'Jane Doe')
    await expect(cycleCountApi.cancelSession(session.id, 'Jane Doe', 'oops')).rejects.toThrow(/already completed/i)
  })
})
