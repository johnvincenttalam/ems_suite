import { describe, it, expect } from 'vitest'
import { buildDepartmentPerformance } from './department-performance'
import type { Department } from '@/features/departments'
import type { ProcurementRequest } from '@/features/procurement'
import type { AppDocument } from '@/features/documents'

const dept = (id: string, name: string, code: string): Department => ({
  id,
  name,
  code,
  manager: 'Manager',
  headcount: 1,
  createdAt: '2025-01-01',
})

const req = (id: string, departmentId: string, status: ProcurementRequest['status']): ProcurementRequest => ({
  id,
  departmentId,
  requesterId: 'U001',
  status,
  createdAt: '2026-04-01T00:00:00Z',
})

const doc = (id: string, departmentId: string | undefined, status: AppDocument['status']): AppDocument => ({
  id,
  title: id,
  fileName: `${id}.pdf`,
  fileType: 'pdf',
  fileSizeBytes: 1000,
  status,
  version: 1,
  approvers: [],
  signatures: [],
  createdBy: 'U001',
  createdAt: '2026-04-01T00:00:00Z',
  departmentId,
})

describe('buildDepartmentPerformance', () => {
  it('ranks departments by total open workload', () => {
    const departments = [dept('D1', 'Ops', 'OPS'), dept('D2', 'Finance', 'FIN'), dept('D3', 'HR', 'HR')]
    const requests = [
      req('R1', 'D1', 'pending'),
      req('R2', 'D1', 'pending'),
      req('R3', 'D2', 'pending'),
      req('R4', 'D1', 'approved'),
    ]
    const documents = [
      doc('DOC-1', 'D2', 'in_review'),
      doc('DOC-2', 'D2', 'in_review'),
      doc('DOC-3', 'D3', 'approved'),
    ]
    const result = buildDepartmentPerformance(departments, requests, documents)
    expect(result.map((r) => r.departmentId)).toEqual(['D2', 'D1', 'D3'])
    expect(result[0].docsInWorkflow).toBe(2)
    expect(result[0].pendingProcurement).toBe(1)
    expect(result[0].total).toBe(3)
  })

  it('only counts pending requests and in_review docs', () => {
    const departments = [dept('D1', 'Ops', 'OPS')]
    const requests = [
      req('R1', 'D1', 'approved'),
      req('R2', 'D1', 'rejected'),
    ]
    const documents = [
      doc('DOC-1', 'D1', 'approved'),
      doc('DOC-2', 'D1', 'archived'),
    ]
    const result = buildDepartmentPerformance(departments, requests, documents)
    expect(result[0].total).toBe(0)
  })

  it('breaks ties by department name alphabetically', () => {
    const departments = [dept('D2', 'Beta', 'B'), dept('D1', 'Alpha', 'A')]
    const requests = [req('R1', 'D1', 'pending'), req('R2', 'D2', 'pending')]
    const result = buildDepartmentPerformance(departments, requests, [])
    expect(result[0].name).toBe('Alpha')
    expect(result[1].name).toBe('Beta')
  })

  it('includes departments with zero workload', () => {
    const departments = [dept('D1', 'Ops', 'OPS')]
    const result = buildDepartmentPerformance(departments, [], [])
    expect(result).toHaveLength(1)
    expect(result[0].total).toBe(0)
  })

  it('skips documents with undefined departmentId', () => {
    const departments = [dept('D1', 'Ops', 'OPS')]
    const documents = [doc('DOC-1', undefined, 'in_review')]
    const result = buildDepartmentPerformance(departments, [], documents)
    expect(result[0].docsInWorkflow).toBe(0)
  })
})
