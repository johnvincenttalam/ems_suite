import type { Warehouse, WarehouseType } from '@/features/warehouses/types'
import { mockWarehouses } from '@/features/warehouses/data/mock-warehouses'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface AddWarehouseInput {
  name: string
  type: WarehouseType
  address: string
  contact?: string
  capacity?: number
  createdBy: string
}

interface UpdateWarehouseInput {
  name?: string
  type?: WarehouseType
  address?: string
  contact?: string
  capacity?: number
  updatedBy: string
}

function nextWarehouseId(): string {
  const max = mockWarehouses.reduce((m, w) => {
    const n = Number(w.id.replace(/^W/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `W${String(max + 1).padStart(3, '0')}`
}

export const warehousesApi = {
  list: async (): Promise<Warehouse[]> => {
    await delay()
    return mockWarehouses
  },

  create: async (input: AddWarehouseInput): Promise<Warehouse> => {
    const w: Warehouse = {
      id: nextWarehouseId(),
      name: input.name,
      type: input.type,
      address: input.address,
      contact: input.contact,
      capacity: input.capacity,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockWarehouses.push(w)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Admin',
      detail: `Added ${w.type} "${w.name}"`,
    })
    return w
  },

  update: async (id: string, input: UpdateWarehouseInput): Promise<Warehouse> => {
    const idx = mockWarehouses.findIndex((w) => w.id === id)
    if (idx === -1) throw new Error(`Location ${id} not found`)
    const { updatedBy, ...patch } = input
    const updated: Warehouse = {
      ...mockWarehouses[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockWarehouses[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Admin',
      detail: `Updated location "${updated.name}"`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockWarehouses.findIndex((w) => w.id === id)
    if (idx === -1) throw new Error(`Location ${id} not found`)
    const removed = mockWarehouses[idx]
    mockWarehouses.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Admin',
      detail: `Deleted location "${removed.name}"`,
    })
  },
}
