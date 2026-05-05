import type { Department } from '@/features/departments/types'
import { mockDepartments } from '@/features/departments/data/mock-departments'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface AddDepartmentInput {
  name: string
  code: string
  manager?: string
  headcount: number
  createdBy: string
}

interface UpdateDepartmentInput {
  name?: string
  code?: string
  manager?: string
  headcount?: number
  updatedBy: string
}

function nextDepartmentId(): string {
  const max = mockDepartments.reduce((m, d) => {
    const n = Number(d.id.replace(/^D/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `D${String(max + 1).padStart(3, '0')}`
}

/**
 * Departments API — swap with real HTTP when backend is ready:
 *   list:     () => http.get<Department[]>('/departments')
 *   create:   (body) => http.post<Department>('/departments', body)
 *   update:   (id, body) => http.patch<Department>(`/departments/${id}`, body)
 *   remove:   (id) => http.del(`/departments/${id}`)
 */
export const departmentsApi = {
  list: async (): Promise<Department[]> => {
    await delay()
    return mockDepartments
  },

  create: async (input: AddDepartmentInput): Promise<Department> => {
    if (mockDepartments.some((d) => d.code.toLowerCase() === input.code.toLowerCase())) {
      throw new Error(`Code "${input.code}" already exists`)
    }
    const dept: Department = {
      id: nextDepartmentId(),
      name: input.name,
      code: input.code.toUpperCase(),
      manager: input.manager,
      headcount: input.headcount,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockDepartments.push(dept)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Admin',
      detail: `Added department ${dept.code} — ${dept.name}`,
    })
    return dept
  },

  update: async (id: string, input: UpdateDepartmentInput): Promise<Department> => {
    const idx = mockDepartments.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Department ${id} not found`)
    if (input.code && input.code.toLowerCase() !== mockDepartments[idx].code.toLowerCase()) {
      if (mockDepartments.some((d) => d.id !== id && d.code.toLowerCase() === input.code!.toLowerCase())) {
        throw new Error(`Code "${input.code}" already exists`)
      }
    }
    const { updatedBy, code, ...patch } = input
    const updated: Department = {
      ...mockDepartments[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      ...(code ? { code: code.toUpperCase() } : {}),
    }
    mockDepartments[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Admin',
      detail: `Updated department ${updated.code} — ${updated.name}`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockDepartments.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Department ${id} not found`)
    const removed = mockDepartments[idx]
    mockDepartments.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Admin',
      detail: `Deleted department ${removed.code} — ${removed.name}`,
    })
  },
}
