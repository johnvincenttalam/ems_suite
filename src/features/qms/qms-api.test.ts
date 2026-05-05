import { describe, it, expect } from 'vitest'
import { qmsApi } from './api/qms-api'
import { mockUsers } from '@/features/users'

describe('qmsApi.listTemplates', () => {
  it('returns at least one template', async () => {
    const result = await qmsApi.listTemplates()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every template has at least one section with at least one metric', async () => {
    const result = await qmsApi.listTemplates()
    for (const t of result) {
      expect(t.sections.length).toBeGreaterThan(0)
      expect(t.sections.every((s) => s.metrics.length > 0)).toBe(true)
    }
  })

  it('every metric id within a template is unique', async () => {
    const result = await qmsApi.listTemplates()
    for (const t of result) {
      const ids = t.sections.flatMap((s) => s.metrics.map((m) => m.id))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('qmsApi.listReports', () => {
  it('returns reports newest period first', async () => {
    const result = await qmsApi.listReports()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].periodStart >= result[i].periodStart).toBe(true)
    }
  })

  it('every periodEnd is on or after periodStart', async () => {
    const result = await qmsApi.listReports()
    expect(result.every((r) => r.periodEnd >= r.periodStart)).toBe(true)
  })

  it('every report references a known template', async () => {
    const reports = await qmsApi.listReports()
    const templates = await qmsApi.listTemplates()
    const ids = new Set(templates.map((t) => t.id))
    expect(reports.every((r) => ids.has(r.templateId))).toBe(true)
  })

  it('every report section references a templateSectionId from its template', async () => {
    const reports = await qmsApi.listReports()
    const templates = await qmsApi.listTemplates()
    const tplMap = Object.fromEntries(templates.map((t) => [t.id, t]))
    for (const r of reports) {
      const tplSectionIds = new Set(tplMap[r.templateId].sections.map((s) => s.id))
      expect(r.sections.every((s) => tplSectionIds.has(s.templateSectionId))).toBe(true)
    }
  })

  it('every report metric references a templateMetricId from the template', async () => {
    const reports = await qmsApi.listReports()
    const templates = await qmsApi.listTemplates()
    const tplMap = Object.fromEntries(templates.map((t) => [t.id, t]))
    for (const r of reports) {
      const tpl = tplMap[r.templateId]
      const tplMetricIds = new Set(tpl.sections.flatMap((s) => s.metrics.map((m) => m.id)))
      const reportMetricIds = r.sections.flatMap((s) => s.metrics.map((m) => m.templateMetricId))
      expect(reportMetricIds.every((id) => tplMetricIds.has(id))).toBe(true)
    }
  })

  it('every preparedBy is a known user', async () => {
    const reports = await qmsApi.listReports()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(reports.every((r) => userIds.has(r.preparedBy))).toBe(true)
  })

  it('published reports carry publishedBy and publishedAt', async () => {
    const reports = await qmsApi.listReports()
    const published = reports.filter((r) => r.status === 'published')
    expect(published.length).toBeGreaterThan(0)
    expect(published.every((r) => !!r.publishedBy && !!r.publishedAt)).toBe(true)
  })

  it('draft reports do not carry publishedAt', async () => {
    const reports = await qmsApi.listReports()
    expect(reports.filter((r) => r.status === 'draft').every((r) => !r.publishedAt)).toBe(true)
  })

  it('every report metric status reflects target satisfaction logically', async () => {
    const reports = await qmsApi.listReports()
    for (const r of reports) {
      for (const s of r.sections) {
        for (const m of s.metrics) {
          const meets =
            m.comparator === 'gt' ? m.value > m.target :
            m.comparator === 'gte' ? m.value >= m.target :
            m.comparator === 'lt' ? m.value < m.target :
            m.comparator === 'lte' ? m.value <= m.target :
            m.value === m.target
          if (m.status === 'pass') {
            expect(meets).toBe(true)
          } else if (m.status === 'fail') {
            expect(meets).toBe(false)
          }
          // 'warn' is allowed in either direction (close to target)
        }
      }
    }
  })
})
