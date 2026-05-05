import { describe, it, expect } from 'vitest'
import { trackingApi } from './api/tracking-api'
import { mockUsers } from '@/features/users'
import { mockAssets } from '@/features/assets'
import { mockInventoryItems } from '@/features/inventory'
import { mockVehicles } from '@/features/fleet'

describe('trackingApi.listTags', () => {
  it('returns at least one tag', async () => {
    const result = await trackingApi.listTags()
    expect(result.length).toBeGreaterThan(0)
  })

  it('tag codes are unique', async () => {
    const result = await trackingApi.listTags()
    const codes = result.map((t) => t.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every boundEntityId references a real entity per its boundEntityType', async () => {
    const result = await trackingApi.listTags()
    const vehicleIds = new Set(mockVehicles.map((v) => v.id))
    const assetIds = new Set(mockAssets.map((a) => a.id))
    const itemIds = new Set(mockInventoryItems.map((i) => i.id))
    for (const tag of result) {
      if (tag.boundEntityType === 'vehicle') expect(vehicleIds.has(tag.boundEntityId)).toBe(true)
      else if (tag.boundEntityType === 'asset') expect(assetIds.has(tag.boundEntityId)).toBe(true)
      else if (tag.boundEntityType === 'item') expect(itemIds.has(tag.boundEntityId)).toBe(true)
    }
  })
})

describe('trackingApi.listLogs', () => {
  it('returns logs newest-first', async () => {
    const result = await trackingApi.listLogs()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].timestamp >= result[i].timestamp).toBe(true)
    }
  })

  it('every tagId references a known tag', async () => {
    const logs = await trackingApi.listLogs()
    const tags = await trackingApi.listTags()
    const ids = new Set(tags.map((t) => t.id))
    expect(logs.every((l) => ids.has(l.tagId))).toBe(true)
  })

  it('GPS logs include latitude and longitude', async () => {
    const logs = await trackingApi.listLogs()
    const gps = logs.filter((l) => l.source === 'gps')
    expect(gps.length).toBeGreaterThan(0)
    expect(gps.every((l) => l.latitude != null && l.longitude != null)).toBe(true)
  })

  it('every scannedBy references a known user', async () => {
    const logs = await trackingApi.listLogs()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(logs.every((l) => !l.scannedBy || userIds.has(l.scannedBy))).toBe(true)
  })

  it('log.entityType matches the bound tag.boundEntityType', async () => {
    const logs = await trackingApi.listLogs()
    const tags = await trackingApi.listTags()
    const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]))
    expect(logs.every((l) => tagMap[l.tagId]?.boundEntityType === l.entityType)).toBe(true)
  })

  it('log.entityId matches the bound tag.boundEntityId', async () => {
    const logs = await trackingApi.listLogs()
    const tags = await trackingApi.listTags()
    const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]))
    expect(logs.every((l) => tagMap[l.tagId]?.boundEntityId === l.entityId)).toBe(true)
  })
})
