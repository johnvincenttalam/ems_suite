import { describe, it, expect } from 'vitest'
import { assetsApi } from './api/assets-api'
import { mockCategories } from '@/features/categories'
import { mockWarehouses } from '@/features/warehouses'
import { mockUsers } from '@/features/users'

describe('assetsApi.list', () => {
  it('returns at least one asset', async () => {
    const result = await assetsApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every asset only references asset-type categories', async () => {
    const result = await assetsApi.list()
    const assetCatIds = new Set(mockCategories.filter((c) => c.type === 'asset').map((c) => c.id))
    expect(result.every((a) => assetCatIds.has(a.categoryId))).toBe(true)
  })

  it('every asset references a valid location', async () => {
    const result = await assetsApi.list()
    const locIds = new Set(mockWarehouses.map((w) => w.id))
    expect(result.every((a) => locIds.has(a.locationId))).toBe(true)
  })

  it('serial numbers are unique', async () => {
    const result = await assetsApi.list()
    const serials = result.map((a) => a.serialNumber)
    expect(new Set(serials).size).toBe(serials.length)
  })

  it('every assignedTo references a known user', async () => {
    const result = await assetsApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((a) => !a.assignedTo || userIds.has(a.assignedTo))).toBe(true)
  })

  it('disposed assets do not retain an assignment', async () => {
    const result = await assetsApi.list()
    expect(result.filter((a) => a.status === 'disposed').every((a) => !a.assignedTo)).toBe(true)
  })
})

describe('assetsApi.listAssignments', () => {
  it('returns assignments newest-first', async () => {
    const result = await assetsApi.listAssignments()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].assignedDate >= result[i].assignedDate).toBe(true)
    }
  })

  it('returnedDate, when present, is on or after assignedDate', async () => {
    const result = await assetsApi.listAssignments()
    expect(result.every((a) => !a.returnedDate || a.returnedDate >= a.assignedDate)).toBe(true)
  })
})

describe('assetsApi.create / update', () => {
  it('creates an asset with default condition=good and emits a created event', async () => {
    const created = await assetsApi.create({
      name: 'Test Tablet',
      serialNumber: `SN-TEST-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    expect(created.status).toBe('active')
    expect(created.condition).toBe('good')
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'created')).toBe(true)
  })

  it('rejects duplicate serial numbers', async () => {
    const sn = `SN-DUP-${Date.now()}`
    await assetsApi.create({
      name: 'First',
      serialNumber: sn,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await expect(
      assetsApi.create({
        name: 'Second',
        serialNumber: sn,
        categoryId: 'C001',
        locationId: 'W001',
        purchaseDate: '2026-05-01',
        createdBy: 'Admin User',
      }),
    ).rejects.toThrow(/already exists/i)
  })

  it('emits a condition_changed event when condition is updated', async () => {
    const created = await assetsApi.create({
      name: 'Condition Tracker',
      serialNumber: `SN-COND-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      condition: 'good',
      createdBy: 'Admin User',
    })
    await assetsApi.update(created.id, { condition: 'fair', updatedBy: 'Jane Doe' })
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'condition_changed')).toBe(true)
  })
})

describe('assetsApi.assign / return', () => {
  it('assign sets assignedTo, opens an assignment record, and emits an event', async () => {
    const created = await assetsApi.create({
      name: 'Assignable Laptop',
      serialNumber: `SN-ASN-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.assign({ assetId: created.id, userId: 'U002', actorName: 'Admin User', notes: 'demo' })
    const list = await assetsApi.list()
    const after = list.find((a) => a.id === created.id)!
    expect(after.assignedTo).toBe('U002')
    const assignments = await assetsApi.listAssignments()
    expect(assignments.some((x) => x.assetId === created.id && x.assignedTo === 'U002' && !x.returnedDate)).toBe(true)
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'assigned')).toBe(true)
  })

  it('refuses to double-assign without a return', async () => {
    const created = await assetsApi.create({
      name: 'Double Assign',
      serialNumber: `SN-DBL-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.assign({ assetId: created.id, userId: 'U002', actorName: 'Admin User' })
    await expect(
      assetsApi.assign({ assetId: created.id, userId: 'U003', actorName: 'Admin User' }),
    ).rejects.toThrow(/already assigned/i)
  })

  it('return clears assignedTo, stamps returnedDate, and emits an event', async () => {
    const created = await assetsApi.create({
      name: 'Returnable',
      serialNumber: `SN-RET-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.assign({ assetId: created.id, userId: 'U002', actorName: 'Admin User' })
    await assetsApi.return({ assetId: created.id, actorName: 'U002' })
    const list = await assetsApi.list()
    const after = list.find((a) => a.id === created.id)!
    expect(after.assignedTo).toBeUndefined()
    const assignments = await assetsApi.listAssignments()
    const closed = assignments.find((x) => x.assetId === created.id)
    expect(closed?.returnedDate).toBeTruthy()
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'returned')).toBe(true)
  })
})

describe('assetsApi.transfer', () => {
  it('moves the asset to a new location and emits a transfer event', async () => {
    const created = await assetsApi.create({
      name: 'Transferable',
      serialNumber: `SN-TXF-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.transfer({ assetId: created.id, toLocationId: 'W002', actorName: 'Admin User' })
    const list = await assetsApi.list()
    const after = list.find((a) => a.id === created.id)!
    expect(after.locationId).toBe('W002')
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'transferred')).toBe(true)
  })

  it('refuses to transfer to the same location', async () => {
    const created = await assetsApi.create({
      name: 'Same Location',
      serialNumber: `SN-SAME-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await expect(
      assetsApi.transfer({ assetId: created.id, toLocationId: 'W001', actorName: 'Admin User' }),
    ).rejects.toThrow(/already at the target/i)
  })
})

describe('assetsApi.submitDisposal / approveDisposal / rejectDisposal', () => {
  it('submitDisposal flips status to retiring, approveDisposal finalizes', async () => {
    const created = await assetsApi.create({
      name: 'Disposable',
      serialNumber: `SN-DIS-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'scrapped',
      reason: 'beyond economic repair',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    let list = await assetsApi.list()
    expect(list.find((a) => a.id === created.id)!.status).toBe('retiring')

    await assetsApi.approveDisposal(created.id, 'Admin User')
    list = await assetsApi.list()
    const final = list.find((a) => a.id === created.id)!
    expect(final.status).toBe('disposed')
    expect(final.condition).toBe('out_of_service')
    expect(final.disposal?.approvedBy).toBe('Admin User')
  })

  it('rejectDisposal returns the asset to active and clears the disposal record', async () => {
    const created = await assetsApi.create({
      name: 'Reject Disposal',
      serialNumber: `SN-RJD-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'sold',
      reason: 'sold to vendor',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    await assetsApi.rejectDisposal(created.id, 'Admin User', 'still has resale value')
    const list = await assetsApi.list()
    const after = list.find((a) => a.id === created.id)!
    expect(after.status).toBe('active')
    expect(after.disposal).toBeUndefined()
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'disposal_rejected')).toBe(true)
  })

  it('refuses to approve when no disposal is pending', async () => {
    const created = await assetsApi.create({
      name: 'Premature Approval',
      serialNumber: `SN-PRE-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await expect(assetsApi.approveDisposal(created.id, 'Admin User')).rejects.toThrow(/no pending disposal/i)
  })
})

describe('assetsApi.recordInspection', () => {
  it('rolls overallResult to fail when any line fails and emits an inspection event when submitted', async () => {
    const created = await assetsApi.create({
      name: 'Inspectable',
      serialNumber: `SN-INS-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    const inspection = await assetsApi.recordInspection({
      assetId: created.id,
      inspectionDate: '2026-05-08',
      inspector: 'John Smith',
      lines: [
        { label: 'Test 1', result: 'pass' },
        { label: 'Test 2', result: 'fail', remarks: 'broken' },
      ],
      submit: true,
    })
    expect(inspection.overallResult).toBe('fail')
    expect(inspection.status).toBe('submitted')
    const events = await assetsApi.listEvents(created.id)
    expect(events.some((e) => e.type === 'inspection')).toBe(true)
  })

  it('drafts do not emit a lifecycle event', async () => {
    const created = await assetsApi.create({
      name: 'Draft Inspection',
      serialNumber: `SN-DFT-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    const eventsBefore = (await assetsApi.listEvents(created.id)).length
    await assetsApi.recordInspection({
      assetId: created.id,
      inspectionDate: '2026-05-08',
      inspector: 'John Smith',
      lines: [{ label: 'Test 1', result: 'pass' }],
      submit: false,
    })
    const eventsAfter = (await assetsApi.listEvents(created.id)).length
    expect(eventsAfter).toBe(eventsBefore)
  })
})
