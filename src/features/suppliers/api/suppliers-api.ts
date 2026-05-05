import type { Supplier } from '@/features/suppliers/types'
import { mockSuppliers } from '@/features/suppliers/data/mock-suppliers'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface AddSupplierInput {
  name: string
  contactPerson: string
  contactNumber: string
  email: string
  address: string
  status?: 'active' | 'inactive'
  createdBy: string
}

interface UpdateSupplierInput {
  name?: string
  contactPerson?: string
  contactNumber?: string
  email?: string
  address?: string
  status?: 'active' | 'inactive'
  updatedBy: string
}

function nextSupplierId(): string {
  const max = mockSuppliers.reduce((m, s) => {
    const n = Number(s.id.replace(/^S/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `S${String(max + 1).padStart(3, '0')}`
}

export const suppliersApi = {
  list: async (): Promise<Supplier[]> => {
    await delay()
    return mockSuppliers
  },

  create: async (input: AddSupplierInput): Promise<Supplier> => {
    if (mockSuppliers.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error(`Email "${input.email}" already exists`)
    }
    const s: Supplier = {
      id: nextSupplierId(),
      name: input.name,
      contactPerson: input.contactPerson,
      contactNumber: input.contactNumber,
      email: input.email,
      address: input.address,
      status: input.status ?? 'active',
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockSuppliers.push(s)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Procurement',
      detail: `Added supplier ${s.name}`,
    })
    return s
  },

  update: async (id: string, input: UpdateSupplierInput): Promise<Supplier> => {
    const idx = mockSuppliers.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`Supplier ${id} not found`)
    if (input.email && input.email.toLowerCase() !== mockSuppliers[idx].email.toLowerCase()) {
      if (mockSuppliers.some((s) => s.id !== id && s.email.toLowerCase() === input.email!.toLowerCase())) {
        throw new Error(`Email "${input.email}" already exists`)
      }
    }
    const { updatedBy, ...patch } = input
    const updated: Supplier = {
      ...mockSuppliers[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockSuppliers[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Procurement',
      detail: `Updated supplier ${updated.name}`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockSuppliers.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`Supplier ${id} not found`)
    const removed = mockSuppliers[idx]
    mockSuppliers.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Procurement',
      detail: `Deleted supplier ${removed.name}`,
    })
  },
}
