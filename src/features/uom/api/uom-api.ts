import type { Uom } from '@/features/uom/types'
import { mockUom } from '@/features/uom/data/mock-uom'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface AddUomInput {
  name: string
  symbol: string
  description?: string
  createdBy: string
}

interface UpdateUomInput {
  name?: string
  symbol?: string
  description?: string
  updatedBy: string
}

function nextUomId(): string {
  const max = mockUom.reduce((m, u) => {
    const n = Number(u.id.replace(/^U/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `U${String(max + 1).padStart(3, '0')}`
}

export const uomApi = {
  list: async (): Promise<Uom[]> => {
    await delay()
    return mockUom
  },

  create: async (input: AddUomInput): Promise<Uom> => {
    if (mockUom.some((u) => u.symbol.toLowerCase() === input.symbol.toLowerCase())) {
      throw new Error(`Symbol "${input.symbol}" already exists`)
    }
    const u: Uom = {
      id: nextUomId(),
      name: input.name,
      symbol: input.symbol,
      description: input.description,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockUom.push(u)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Admin',
      detail: `Added UOM ${u.name} (${u.symbol})`,
    })
    return u
  },

  update: async (id: string, input: UpdateUomInput): Promise<Uom> => {
    const idx = mockUom.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`UOM ${id} not found`)
    if (input.symbol && input.symbol.toLowerCase() !== mockUom[idx].symbol.toLowerCase()) {
      if (mockUom.some((u) => u.id !== id && u.symbol.toLowerCase() === input.symbol!.toLowerCase())) {
        throw new Error(`Symbol "${input.symbol}" already exists`)
      }
    }
    const { updatedBy, ...patch } = input
    const updated: Uom = {
      ...mockUom[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockUom[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Admin',
      detail: `Updated UOM ${updated.name} (${updated.symbol})`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockUom.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`UOM ${id} not found`)
    const removed = mockUom[idx]
    mockUom.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Admin',
      detail: `Deleted UOM ${removed.name} (${removed.symbol})`,
    })
  },
}
