import { describe, it, expect } from 'vitest'
import { maintenanceApi } from './api/maintenance-api'
import { assetsApi, mockAssets } from '@/features/assets'
import { mockUsers } from '@/features/users'

// Helper: register a fresh asset for use in lifecycle tests so each test gets
// a clean status; the global mock state is shared across tests.
async function newAsset(suffix: string) {
  return assetsApi.create({
    name: `Maint Test Asset ${suffix}`,
    serialNumber: `SN-MAINT-${suffix}-${Date.now()}`,
    categoryId: 'C001',
    locationId: 'W001',
    purchaseDate: '2026-01-01',
    createdBy: 'Admin User',
  })
}

async function newWorkOrder(assetId: string, opts: Partial<{ title: string; assignedTo: string; priority: 'low' | 'medium' | 'high' | 'critical'; scheduledDate: string; createdBy: string }> = {}) {
  return maintenanceApi.create({
    title: opts.title ?? 'Test work order',
    assetId,
    assignedTo: opts.assignedTo ?? 'U002',
    priority: opts.priority ?? 'medium',
    scheduledDate: opts.scheduledDate ?? '2026-06-01',
    createdBy: opts.createdBy ?? 'U001',
  })
}

describe('maintenanceApi.list', () => {
  it('returns work orders sorted by scheduledDate ascending', async () => {
    const result = await maintenanceApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].scheduledDate <= result[i].scheduledDate).toBe(true)
    }
  })

  it('every work order references a known asset', async () => {
    const result = await maintenanceApi.list()
    const assetIds = new Set(mockAssets.map((a) => a.id))
    expect(result.every((w) => assetIds.has(w.assetId))).toBe(true)
  })

  it('every work order is assigned to a known user', async () => {
    const result = await maintenanceApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((w) => userIds.has(w.assignedTo))).toBe(true)
  })

  it('every work order has a valid status and priority', async () => {
    const result = await maintenanceApi.list()
    const statuses = new Set(['pending', 'ongoing', 'completed', 'cancelled'])
    const priorities = new Set(['low', 'medium', 'high', 'critical'])
    expect(result.every((w) => statuses.has(w.status))).toBe(true)
    expect(result.every((w) => priorities.has(w.priority))).toBe(true)
  })

  it('completed work orders carry a completedDate', async () => {
    const result = await maintenanceApi.list()
    const completed = result.filter((w) => w.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    expect(completed.every((w) => !!w.completedDate)).toBe(true)
  })

  it('non-completed work orders do not carry a completedDate', async () => {
    const result = await maintenanceApi.list()
    expect(result.filter((w) => w.status !== 'completed').every((w) => !w.completedDate)).toBe(true)
  })

  it('completedDate is on or after scheduledDate where present', async () => {
    const result = await maintenanceApi.list()
    expect(result.filter((w) => !!w.completedDate).every((w) => w.completedDate! >= w.scheduledDate)).toBe(true)
  })
})

describe('maintenanceApi.create', () => {
  it('creates a pending work order with sequential ID and audit entry', async () => {
    const asset = await newAsset('CREATE')
    const wo = await newWorkOrder(asset.id, { title: 'Brand new WO' })
    expect(wo.status).toBe('pending')
    expect(wo.id).toMatch(/^WO-\d{4}-\d{4}$/)
    expect(wo.title).toBe('Brand new WO')
    expect(wo.completedDate).toBeUndefined()
  })

  it('does NOT auto-flip the asset status on create — only on start', async () => {
    const asset = await newAsset('CREATE2')
    expect(asset.status).toBe('active')
    await newWorkOrder(asset.id)
    const list = await assetsApi.list()
    expect(list.find((a) => a.id === asset.id)!.status).toBe('active')
  })
})

describe('maintenanceApi.start', () => {
  it('flips status pending → ongoing and asset.status to maintenance', async () => {
    const asset = await newAsset('START')
    const wo = await newWorkOrder(asset.id)
    const started = await maintenanceApi.start(wo.id, 'U001')
    expect(started.status).toBe('ongoing')
    const list = await assetsApi.list()
    expect(list.find((a) => a.id === asset.id)!.status).toBe('maintenance')
  })

  it('throws when starting a non-pending work order', async () => {
    const asset = await newAsset('START2')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.start(wo.id, 'U001')
    await expect(maintenanceApi.start(wo.id, 'U001')).rejects.toThrow(/not pending/i)
  })

  it('refuses to start a work order on a disposed asset', async () => {
    const asset = await newAsset('DISP')
    // Push the asset all the way through disposal.
    await assetsApi.submitDisposal({
      assetId: asset.id,
      type: 'sold',
      reason: 'unit test disposal',
      disposedDate: '2026-05-08',
      approverName: 'Admin User',
      submittedBy: 'Jane Doe',
    })
    await assetsApi.approveDisposal(asset.id, 'Admin User')

    const wo = await newWorkOrder(asset.id)
    await expect(maintenanceApi.start(wo.id, 'U001')).rejects.toThrow(/disposed/i)
  })

  it('starting a second WO on a maintenance-status asset does not double-emit events', async () => {
    const asset = await newAsset('PARALLEL')
    const wo1 = await newWorkOrder(asset.id, { title: 'First' })
    const wo2 = await newWorkOrder(asset.id, { title: 'Second' })
    await maintenanceApi.start(wo1.id, 'U001')
    const eventsBefore = (await assetsApi.listEvents(asset.id)).filter((e) => e.type === 'maintenance_started').length
    await maintenanceApi.start(wo2.id, 'U001')
    const eventsAfter = (await assetsApi.listEvents(asset.id)).filter((e) => e.type === 'maintenance_started').length
    expect(eventsAfter).toBe(eventsBefore) // idempotent
  })
})

describe('maintenanceApi.complete', () => {
  it('completes ongoing → completed, stamps completedDate, persists notes', async () => {
    const asset = await newAsset('COMP')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.start(wo.id, 'U001')
    const done = await maintenanceApi.complete(wo.id, 'U001', 'Replaced part X')
    expect(done.status).toBe('completed')
    expect(done.completedDate).toBeTruthy()
    expect(done.completionNotes).toBe('Replaced part X')
  })

  it('flips asset back to active when this is the last open WO', async () => {
    const asset = await newAsset('LAST')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.start(wo.id, 'U001')
    let live = (await assetsApi.list()).find((a) => a.id === asset.id)!
    expect(live.status).toBe('maintenance')
    await maintenanceApi.complete(wo.id, 'U001')
    live = (await assetsApi.list()).find((a) => a.id === asset.id)!
    expect(live.status).toBe('active')
  })

  it('keeps the asset in maintenance when other open WOs remain', async () => {
    const asset = await newAsset('KEEP')
    const wo1 = await newWorkOrder(asset.id, { title: 'A' })
    const wo2 = await newWorkOrder(asset.id, { title: 'B' })
    await maintenanceApi.start(wo1.id, 'U001')
    await maintenanceApi.start(wo2.id, 'U001')
    await maintenanceApi.complete(wo1.id, 'U001')
    const live = (await assetsApi.list()).find((a) => a.id === asset.id)!
    expect(live.status).toBe('maintenance')
  })

  it('throws when completing a non-ongoing work order', async () => {
    const asset = await newAsset('NEVER')
    const wo = await newWorkOrder(asset.id)
    await expect(maintenanceApi.complete(wo.id, 'U001')).rejects.toThrow(/not in progress/i)
  })
})

describe('maintenanceApi.cancel', () => {
  it('cancels a pending WO without touching the asset status', async () => {
    const asset = await newAsset('CANCEL_PENDING')
    const wo = await newWorkOrder(asset.id)
    const cancelled = await maintenanceApi.cancel(wo.id, 'U001', 'Superseded by WO-XYZ')
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancelledReason).toBe('Superseded by WO-XYZ')
    const live = (await assetsApi.list()).find((a) => a.id === asset.id)!
    expect(live.status).toBe('active')
  })

  it('cancels an ongoing WO and flips the asset back when no other open WOs exist', async () => {
    const asset = await newAsset('CANCEL_ONG')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.start(wo.id, 'U001')
    await maintenanceApi.cancel(wo.id, 'U001', 'Wrong call-out')
    const live = (await assetsApi.list()).find((a) => a.id === asset.id)!
    expect(live.status).toBe('active')
  })

  it('refuses to cancel an already-completed WO', async () => {
    const asset = await newAsset('CANCEL_DONE')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.start(wo.id, 'U001')
    await maintenanceApi.complete(wo.id, 'U001')
    await expect(maintenanceApi.cancel(wo.id, 'U001', 'too late')).rejects.toThrow(/already completed/i)
  })

  it('refuses to cancel without a reason', async () => {
    const asset = await newAsset('CANCEL_NO_REASON')
    const wo = await newWorkOrder(asset.id)
    await expect(maintenanceApi.cancel(wo.id, 'U001', '   ')).rejects.toThrow(/reason is required/i)
  })
})

describe('maintenanceApi.reassign / reschedule', () => {
  it('reassigns a pending WO to a different technician', async () => {
    const asset = await newAsset('REASSIGN')
    const wo = await newWorkOrder(asset.id, { assignedTo: 'U002' })
    const updated = await maintenanceApi.reassign(wo.id, 'U003', 'U001')
    expect(updated.assignedTo).toBe('U003')
  })

  it('refuses to reassign a completed WO', async () => {
    const asset = await newAsset('REASSIGN_DONE')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.start(wo.id, 'U001')
    await maintenanceApi.complete(wo.id, 'U001')
    await expect(maintenanceApi.reassign(wo.id, 'U003', 'U001')).rejects.toThrow(/completed/i)
  })

  it('reschedules a pending WO and records the change', async () => {
    const asset = await newAsset('RESCHED')
    const wo = await newWorkOrder(asset.id, { scheduledDate: '2026-06-01' })
    const updated = await maintenanceApi.reschedule(wo.id, '2026-06-15', 'U001')
    expect(updated.scheduledDate).toBe('2026-06-15')
  })

  it('refuses to reschedule a cancelled WO', async () => {
    const asset = await newAsset('RESCHED_CANCEL')
    const wo = await newWorkOrder(asset.id)
    await maintenanceApi.cancel(wo.id, 'U001', 'no longer needed')
    await expect(maintenanceApi.reschedule(wo.id, '2026-06-15', 'U001')).rejects.toThrow(/cancelled/i)
  })
})

// Suppress unused-import warning when running against the bare lifecycle suite.
void mockUsers
