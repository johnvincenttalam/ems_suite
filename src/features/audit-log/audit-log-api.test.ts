import { describe, it, expect } from 'vitest'
import { auditLogApi } from './api/audit-log-api'

describe('auditLogApi.list', () => {
  it('returns entries newest-first', async () => {
    const result = await auditLogApi.list()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].timestamp >= result[i].timestamp).toBe(true)
    }
  })

  it('every entry references a known action type', async () => {
    const result = await auditLogApi.list()
    const allowed = new Set(['create', 'update', 'delete', 'login', 'logout', 'approve', 'reject'])
    expect(result.every((e) => allowed.has(e.action))).toBe(true)
  })
})
