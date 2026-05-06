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
  employeeId?: string
  departmentId?: string
  position?: string
  status?: 'active' | 'inactive'
  modules?: ModuleKey[]
  createdBy: string
}

interface UpdateUserInput {
  name?: string
  email?: string
  phone?: string
  employeeId?: string
  departmentId?: string
  position?: string
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

export function nextEmployeeId(): string {
  const max = mockUsers.reduce((m, u) => {
    const n = Number(u.employeeId?.replace(/^EMP-/, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `EMP-${String(max + 1).padStart(3, '0')}`
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
      employeeId: input.employeeId,
      departmentId: input.departmentId,
      position: input.position,
      role: 'admin',
      status: input.status ?? 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      modules: input.modules ?? [],
      moduleAdmins: [],
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

  /**
   * Invite a user to a specific module. If the email already exists, grants
   * access to that module; otherwise creates a new user and grants access.
   * The audit entry is tagged with the inviting module's display name so it
   * surfaces in that module's logs view. Caller authorization (isModuleAdmin
   * for the target module) is enforced in the calling component.
   */
  inviteToModule: async (input: {
    name: string
    email: string
    phone?: string
    moduleKey: ModuleKey
    auditModule: string
    invitedBy: string
  }): Promise<{ user: User; created: boolean }> => {
    await delay(120)
    const existing = mockUsers.find((u) => u.email.toLowerCase() === input.email.toLowerCase())
    if (existing) {
      if (existing.modules.includes(input.moduleKey)) {
        throw new Error(`${existing.name} already has access to this module`)
      }
      existing.modules = [...existing.modules, input.moduleKey]
      recordAudit({
        userId: input.invitedBy,
        action: 'update',
        module: input.auditModule,
        detail: `Granted ${existing.name} access`,
      })
      return { user: existing, created: false }
    }
    const u: User = {
      id: nextUserId(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      modules: [input.moduleKey],
      moduleAdmins: [],
    }
    mockUsers.push(u)
    recordAudit({
      userId: input.invitedBy,
      action: 'create',
      module: input.auditModule,
      detail: `Invited ${u.name} (${u.email}) and granted access`,
    })
    return { user: u, created: true }
  },

  /**
   * Revoke a user's access to a specific module. Their global record stays —
   * other modules they belong to are unaffected. Throws if the user doesn't
   * have access in the first place. Module admins themselves cannot be revoked
   * from a module they administer (would orphan admin power); demote them
   * first by editing moduleAdmins.
   */
  removeFromModule: async (
    userId: string,
    moduleKey: ModuleKey,
    auditModule: string,
    removedBy: string,
  ): Promise<User> => {
    await delay(120)
    const idx = mockUsers.findIndex((u) => u.id === userId)
    if (idx === -1) throw new Error(`User ${userId} not found`)
    const u = mockUsers[idx]
    if (!u.modules.includes(moduleKey)) {
      throw new Error(`${u.name} doesn't have access to this module`)
    }
    if (u.moduleAdmins.includes(moduleKey)) {
      throw new Error(`${u.name} is an admin of this module — demote first`)
    }
    if (userId === removedBy) {
      throw new Error('You cannot revoke your own access')
    }
    u.modules = u.modules.filter((m) => m !== moduleKey)
    recordAudit({
      userId: removedBy,
      action: 'update',
      module: auditModule,
      detail: `Revoked ${u.name}'s access`,
    })
    return u
  },
}
