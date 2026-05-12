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

  it('update patches editable fields (model, vendor, imageUrl, useful life)', async () => {
    const created = await assetsApi.create({
      name: 'Edit Target',
      serialNumber: `SN-EDIT-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.update(created.id, {
      model: 'New Model',
      vendor: 'New Vendor',
      imageUrl: 'data:image/png;base64,iVBOR…',
      usefulLifeMonths: 72,
      salvageValue: 500,
      updatedBy: 'Admin User',
    })
    const list = await assetsApi.list()
    const after = list.find((a) => a.id === created.id)!
    expect(after.model).toBe('New Model')
    expect(after.vendor).toBe('New Vendor')
    expect(after.imageUrl).toBe('data:image/png;base64,iVBOR…')
    expect(after.usefulLifeMonths).toBe(72)
    expect(after.salvageValue).toBe(500)
  })

  it('update leaves unspecified fields untouched', async () => {
    const created = await assetsApi.create({
      name: 'Partial Patch',
      serialNumber: `SN-PRT-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      purchaseCost: 1000,
      vendor: 'Original',
      model: 'M-100',
      createdBy: 'Admin User',
    })
    await assetsApi.update(created.id, { vendor: 'Updated', updatedBy: 'Admin User' })
    const list = await assetsApi.list()
    const after = list.find((a) => a.id === created.id)!
    expect(after.vendor).toBe('Updated')
    expect(after.model).toBe('M-100')
    expect(after.purchaseCost).toBe(1000)
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

  it('refuses to transfer an asset with a pending disposal', async () => {
    const created = await assetsApi.create({
      name: 'Retiring Transfer',
      serialNumber: `SN-RTX-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'sold',
      reason: 'pending',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    await expect(
      assetsApi.transfer({ assetId: created.id, toLocationId: 'W002', actorName: 'Admin User' }),
    ).rejects.toThrow(/pending disposal/i)
  })
})

describe('assetsApi.markMaintenanceStarted', () => {
  it('refuses to start maintenance on a retiring asset', async () => {
    const created = await assetsApi.create({
      name: 'Retiring Maintenance',
      serialNumber: `SN-RMX-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'sold',
      reason: 'pending',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    expect(() => assetsApi.markMaintenanceStarted(created.id, 'Admin User')).toThrow(/pending disposal/i)
  })
})

describe('assetsApi event narration', () => {
  it('renders user names in assigned/returned events instead of IDs', async () => {
    const created = await assetsApi.create({
      name: 'Event Narrator',
      serialNumber: `SN-EVN-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.assign({ assetId: created.id, userId: 'U002', actorName: 'Admin User' })
    await assetsApi.return({ assetId: created.id, actorName: 'U002' })
    const events = await assetsApi.listEvents(created.id)
    const assigned = events.find((e) => e.type === 'assigned')!
    const returned = events.find((e) => e.type === 'returned')!
    expect(assigned.detail).toContain('Jane Doe')
    expect(assigned.detail).not.toContain('U002')
    expect(returned.detail).toContain('Jane Doe')
  })

  it('renders warehouse names in transfer events instead of IDs', async () => {
    const created = await assetsApi.create({
      name: 'Transfer Narrator',
      serialNumber: `SN-TRN-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.transfer({ assetId: created.id, toLocationId: 'W002', actorName: 'Admin User' })
    const events = await assetsApi.listEvents(created.id)
    const transferred = events.find((e) => e.type === 'transferred')!
    expect(transferred.detail).not.toMatch(/W001|W002/)
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

  it('persists pendingApproverName on the disposal record', async () => {
    const created = await assetsApi.create({
      name: 'Approver Tracker',
      serialNumber: `SN-APV-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'sold',
      reason: 'pending approver gate test',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    const list = await assetsApi.list()
    const target = list.find((a) => a.id === created.id)!
    expect(target.disposal?.pendingApproverName).toBe('Admin User')
  })

  it('blocks approvers other than the named one from approving', async () => {
    const created = await assetsApi.create({
      name: 'Wrong Approver',
      serialNumber: `SN-WAP-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'sold',
      reason: 'test',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    await expect(assetsApi.approveDisposal(created.id, 'Jane Doe')).rejects.toThrow(/not the assigned approver/i)
  })

  it('blocks rejectors other than the named approver', async () => {
    const created = await assetsApi.create({
      name: 'Wrong Rejecter',
      serialNumber: `SN-WRJ-${Date.now()}`,
      categoryId: 'C001',
      locationId: 'W001',
      purchaseDate: '2026-05-01',
      createdBy: 'Admin User',
    })
    await assetsApi.submitDisposal({
      assetId: created.id,
      type: 'sold',
      reason: 'test',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    await expect(assetsApi.rejectDisposal(created.id, 'Jane Doe', 'pretending')).rejects.toThrow(/not the assigned approver/i)
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

describe('assetsApi.updateMeter', () => {
  async function newAsset(suffix: string) {
    return assetsApi.create({
      name: `Meter ${suffix}`,
      serialNumber: `SN-METER-${suffix}-${Date.now()}`,
      categoryId: 'C004',
      locationId: 'W001',
      purchaseDate: '2026-01-01',
      createdBy: 'Admin User',
    })
  }

  it('records the first reading and locks the meter unit', async () => {
    const asset = await newAsset('FIRST')
    const updated = await assetsApi.updateMeter(asset.id, 100, 'Tech User', 'hours')
    expect(updated.meterUnit).toBe('hours')
    expect(updated.currentMeter).toBe(100)
    const events = await assetsApi.listEvents(asset.id)
    expect(events.some((e) => e.type === 'meter_updated')).toBe(true)
  })

  it('enforces monotonicity — refuses readings below the current value', async () => {
    const asset = await newAsset('MONO')
    await assetsApi.updateMeter(asset.id, 250, 'Tech', 'hours')
    await expect(assetsApi.updateMeter(asset.id, 200, 'Tech')).rejects.toThrow(/monotonic/i)
  })

  it('refuses to change a locked meter unit', async () => {
    const asset = await newAsset('LOCK')
    await assetsApi.updateMeter(asset.id, 50, 'Tech', 'hours')
    await expect(assetsApi.updateMeter(asset.id, 60, 'Tech', 'kilometers')).rejects.toThrow(/locked/i)
  })

  it('rejects a first reading without a unit', async () => {
    const asset = await newAsset('NOUNIT')
    await expect(assetsApi.updateMeter(asset.id, 10, 'Tech')).rejects.toThrow(/no meter unit/i)
  })
})
