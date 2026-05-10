import type { Driver, DriverStatus } from '@/features/drivers/types'
import { mockDrivers } from '@/features/drivers/data/mock-drivers'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 400 + 250))

interface AddDriverInput {
  name: string
  licenseNumber: string
  licenseClass: string
  licenseExpiry: string
  phone?: string
  email?: string
  employeeId?: string
  departmentId?: string
  status?: DriverStatus
  userId?: string
  notes?: string
  createdBy: string
}

interface UpdateDriverInput {
  name?: string
  licenseNumber?: string
  licenseClass?: string
  licenseExpiry?: string
  phone?: string
  email?: string
  employeeId?: string
  departmentId?: string
  status?: DriverStatus
  userId?: string
  notes?: string
  updatedBy: string
}

function nextDriverId(): string {
  const max = mockDrivers.reduce((m, d) => {
    const n = Number(d.id.replace(/^DRV-/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `DRV-${String(max + 1).padStart(3, '0')}`
}

export const driversApi = {
  list: async (): Promise<Driver[]> => {
    await delay()
    return mockDrivers
  },

  create: async (input: AddDriverInput): Promise<Driver> => {
    if (
      mockDrivers.some(
        (d) => d.licenseNumber.toLowerCase() === input.licenseNumber.toLowerCase(),
      )
    ) {
      throw new Error(`License number "${input.licenseNumber}" is already on file`)
    }
    const driver: Driver = {
      id: nextDriverId(),
      name: input.name,
      licenseNumber: input.licenseNumber,
      licenseClass: input.licenseClass,
      licenseExpiry: input.licenseExpiry,
      phone: input.phone,
      email: input.email,
      employeeId: input.employeeId,
      departmentId: input.departmentId,
      status: input.status ?? 'active',
      userId: input.userId,
      notes: input.notes,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    mockDrivers.push(driver)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Fleet',
      detail: `Added driver ${driver.name}`,
    })
    return driver
  },

  update: async (id: string, input: UpdateDriverInput): Promise<Driver> => {
    const idx = mockDrivers.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Driver ${id} not found`)
    if (
      input.licenseNumber &&
      input.licenseNumber.toLowerCase() !== mockDrivers[idx].licenseNumber.toLowerCase()
    ) {
      if (
        mockDrivers.some(
          (d) =>
            d.id !== id && d.licenseNumber.toLowerCase() === input.licenseNumber!.toLowerCase(),
        )
      ) {
        throw new Error(`License number "${input.licenseNumber}" is already on file`)
      }
    }
    const { updatedBy, ...patch } = input
    const updated: Driver = {
      ...mockDrivers[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockDrivers[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Fleet',
      detail: `Updated driver ${updated.name}`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockDrivers.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error(`Driver ${id} not found`)
    const removed = mockDrivers[idx]
    mockDrivers.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Fleet',
      detail: `Deleted driver ${removed.name}`,
    })
  },
}
