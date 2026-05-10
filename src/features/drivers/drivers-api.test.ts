import { describe, it, expect, beforeEach } from 'vitest'
import { driversApi } from './api/drivers-api'
import { mockDrivers } from './data/mock-drivers'
import { mockUsers } from '@/features/users'
import { mockAuditLog } from '@/features/audit-log/data/mock-audit'

describe('driversApi.list', () => {
  it('returns the seeded drivers', async () => {
    const result = await driversApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every driver has a license number, class, and expiry', async () => {
    const result = await driversApi.list()
    expect(result.every((d) => !!d.licenseNumber && !!d.licenseClass && !!d.licenseExpiry)).toBe(true)
  })

  it('license numbers are unique', async () => {
    const result = await driversApi.list()
    const numbers = result.map((d) => d.licenseNumber.toLowerCase())
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('any userId, when present, references a known user', async () => {
    const result = await driversApi.list()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(result.every((d) => !d.userId || userIds.has(d.userId))).toBe(true)
  })
})

describe('driversApi.create', () => {
  let originalLength: number
  beforeEach(() => {
    originalLength = mockDrivers.length
  })
  function cleanup() {
    while (mockDrivers.length > originalLength) mockDrivers.pop()
  }

  it('creates a driver with status=active by default and emits an audit entry', async () => {
    const auditBefore = mockAuditLog.length
    const driver = await driversApi.create({
      name: 'Test Driver',
      licenseNumber: 'TEST-99-000001',
      licenseClass: 'Restriction 1,2',
      licenseExpiry: '2027-01-01',
      createdBy: 'U001',
    })
    expect(driver.id).toMatch(/^DRV-\d{3}$/)
    expect(driver.status).toBe('active')
    expect(driver.licenseNumber).toBe('TEST-99-000001')
    expect(mockAuditLog.length).toBe(auditBefore + 1)
    cleanup()
  })

  it('refuses a duplicate license number (case-insensitive)', async () => {
    const existing = mockDrivers[0]
    await expect(
      driversApi.create({
        name: 'Other Driver',
        licenseNumber: existing.licenseNumber.toUpperCase(),
        licenseClass: 'Restriction 1',
        licenseExpiry: '2027-01-01',
        createdBy: 'U001',
      }),
    ).rejects.toThrow(/already on file/i)
  })
})

describe('driversApi.update', () => {
  it('updates fields and emits an audit entry', async () => {
    const auditBefore = mockAuditLog.length
    const target = mockDrivers[mockDrivers.length - 1]
    const updated = await driversApi.update(target.id, {
      phone: '+63 999 000 1111',
      updatedBy: 'U001',
    })
    expect(updated.phone).toBe('+63 999 000 1111')
    expect(mockAuditLog.length).toBe(auditBefore + 1)
  })

  it('refuses to update a missing driver', async () => {
    await expect(
      driversApi.update('DRV-999', { name: 'Nope', updatedBy: 'U001' }),
    ).rejects.toThrow(/not found/i)
  })
})
