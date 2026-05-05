import type { User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'
import { mockUsers } from '@/features/users/data/mock-users'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 500 + 300))

interface AddUserInput {
  name: string
  email: string
  phone: string
  status?: 'active' | 'inactive'
  modules?: ModuleKey[]
  createdBy: string
}

interface UpdateUserInput {
  name?: string
  email?: string
  phone?: string
  status?: 'active' | 'inactive'
  modules?: ModuleKey[]
  updatedBy: string
}

function nextUserId(): string {
  const max = mockUsers.reduce((m, u) => {
    const n = Number(u.id.replace(/^U/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `U${String(max + 1).padStart(3, '0')}`
}

/**
 * Users API — swap with real HTTP when backend is ready:
 *   list:   () => http.get<User[]>('/users')
 *   create: (body) => http.post<User>('/users', body)
 *   update: (id, body) => http.patch<User>(`/users/${id}`, body)
 *   remove: (id) => http.del(`/users/${id}`)
 */
export const usersApi = {
  list: async (): Promise<User[]> => {
    await delay()
    return mockUsers
  },

  create: async (input: AddUserInput): Promise<User> => {
    if (mockUsers.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error(`Email "${input.email}" already exists`)
    }
    const u: User = {
      id: nextUserId(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: 'admin',
      status: input.status ?? 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      modules: input.modules ?? [],
    }
    mockUsers.push(u)
    recordAudit({
      userId: input.createdBy,
      action: 'create',
      module: 'Admin',
      detail: `Added user ${u.name} (${u.email})`,
    })
    return u
  },

  update: async (id: string, input: UpdateUserInput): Promise<User> => {
    const idx = mockUsers.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`User ${id} not found`)
    if (input.email && input.email.toLowerCase() !== mockUsers[idx].email.toLowerCase()) {
      if (mockUsers.some((u) => u.id !== id && u.email.toLowerCase() === input.email!.toLowerCase())) {
        throw new Error(`Email "${input.email}" already exists`)
      }
    }
    const { updatedBy, ...patch } = input
    const updated: User = {
      ...mockUsers[idx],
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    }
    mockUsers[idx] = updated
    recordAudit({
      userId: updatedBy,
      action: 'update',
      module: 'Admin',
      detail: `Updated user ${updated.name}`,
    })
    return updated
  },

  remove: async (id: string, deletedBy: string): Promise<void> => {
    const idx = mockUsers.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`User ${id} not found`)
    const removed = mockUsers[idx]
    if (removed.name === deletedBy) throw new Error('You cannot delete your own account')
    mockUsers.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Admin',
      detail: `Deleted user ${removed.name} (${removed.email})`,
    })
  },
}
