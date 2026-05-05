import type { ProcurementRequest } from '@/features/procurement'
import type { AppDocument } from '@/features/documents'
import type { Department } from '@/features/departments'

export interface DepartmentPerformanceRow {
  departmentId: string
  name: string
  code: string
  pendingProcurement: number
  docsInWorkflow: number
  total: number
}

/**
 * Cross-module aggregator: ranks departments by current open workload.
 * Total = pending procurement requests + documents in_review.
 *
 * Pure — easy to test without React. Departments with zero workload are
 * still included; the caller can filter or slice as needed.
 */
export function buildDepartmentPerformance(
  departments: Department[],
  requests: ProcurementRequest[],
  documents: AppDocument[],
): DepartmentPerformanceRow[] {
  const rows = departments.map((d) => {
    const pendingProcurement = requests.filter(
      (r) => r.departmentId === d.id && r.status === 'pending',
    ).length
    const docsInWorkflow = documents.filter(
      (doc) => doc.departmentId === d.id && doc.status === 'in_review',
    ).length
    return {
      departmentId: d.id,
      name: d.name,
      code: d.code,
      pendingProcurement,
      docsInWorkflow,
      total: pendingProcurement + docsInWorkflow,
    }
  })

  return rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return a.name.localeCompare(b.name)
  })
}
