import { describe, it, expect } from 'vitest'
import { checklistsApi } from './api/checklists-api'
import { mockUsers } from '@/features/users'

describe('checklistsApi.listTemplates', () => {
  it('returns at least one template', async () => {
    const result = await checklistsApi.listTemplates()
    expect(result.length).toBeGreaterThan(0)
  })

  it('every template has at least one item', async () => {
    const result = await checklistsApi.listTemplates()
    expect(result.every((t) => t.items.length > 0)).toBe(true)
  })

  it('every item id within a template is unique', async () => {
    const result = await checklistsApi.listTemplates()
    for (const tpl of result) {
      const ids = tpl.items.map((i) => i.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('checklistsApi.listAssignments', () => {
  it('returns assignments newest-first', async () => {
    const result = await checklistsApi.listAssignments()
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].assignedDate >= result[i].assignedDate).toBe(true)
    }
  })

  it('every assignment references a known template', async () => {
    const assignments = await checklistsApi.listAssignments()
    const templates = await checklistsApi.listTemplates()
    const tplIds = new Set(templates.map((t) => t.id))
    expect(assignments.every((a) => tplIds.has(a.templateId))).toBe(true)
  })

  it('every assignedTo is a known user', async () => {
    const assignments = await checklistsApi.listAssignments()
    const userIds = new Set(mockUsers.map((u) => u.id))
    expect(assignments.every((a) => userIds.has(a.assignedTo))).toBe(true)
  })

  it('completed assignments carry completedAt and completedBy', async () => {
    const assignments = await checklistsApi.listAssignments()
    const completed = assignments.filter((a) => a.status === 'completed')
    expect(completed.length).toBeGreaterThan(0)
    expect(completed.every((a) => !!a.completedAt && !!a.completedBy)).toBe(true)
  })

  it('completed assignments cover every required item from their template', async () => {
    const assignments = await checklistsApi.listAssignments()
    const templates = await checklistsApi.listTemplates()
    const tplMap = Object.fromEntries(templates.map((t) => [t.id, t]))
    for (const a of assignments.filter((x) => x.status === 'completed')) {
      const tpl = tplMap[a.templateId]
      const resultItemIds = new Set(a.results.map((r) => r.itemId))
      const requiredItems = tpl.items.filter((i) => i.required)
      expect(requiredItems.every((i) => resultItemIds.has(i.id))).toBe(true)
    }
  })

  it('every result item belongs to its template', async () => {
    const assignments = await checklistsApi.listAssignments()
    const templates = await checklistsApi.listTemplates()
    const tplMap = Object.fromEntries(templates.map((t) => [t.id, t]))
    for (const a of assignments) {
      const tpl = tplMap[a.templateId]
      const tplItemIds = new Set(tpl.items.map((i) => i.id))
      expect(a.results.every((r) => tplItemIds.has(r.itemId))).toBe(true)
    }
  })

  it('non-completed assignments do not carry completedAt', async () => {
    const assignments = await checklistsApi.listAssignments()
    expect(assignments.filter((a) => a.status !== 'completed').every((a) => !a.completedAt)).toBe(true)
  })
})
