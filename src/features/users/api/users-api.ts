import type { ModuleRole, User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'
import { mockUsers } from '@/features/users/data/mock-users'
import { isModuleAdmin } from '@/features/auth/lib/access'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

function findActor(actorId: string): User {
  const actor = mockUsers.find((u) => u.id === actorId)
  if (!actor) throw new Error(`Caller ${actorId} not found`)
  return actor
}

function assertAdminOfModule(actorId: string, moduleKey: ModuleKey): void {
  const actor = findActor(actorId)
  if (!isModuleAdmin(actor, moduleKey)) {
    throw new Error(`You must be an admin of ${moduleKey} to perform this action`)
  }
}

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
  /** Initial per-module role assignments. Empty grants no access. */
  moduleRoles?: Partial<Record<ModuleKey, ModuleRole>>
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
  moduleRoles?: Partial<Record<ModuleKey, ModuleRole>>
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
      status: input.status ?? 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      moduleRoles: input.moduleRoles ?? {},
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
    // Privilege-escalation gate: any change to moduleRoles requires the caller
    // to be admin of every module whose role is actually changing. The UI sends
    // the full map (modules the caller can't admin are unchanged passthroughs),
    // so we diff and only enforce on real deltas.
    if (patch.moduleRoles) {
      const existing = mockUsers[idx].moduleRoles ?? {}
      const next = patch.moduleRoles
      const allModuleKeys = new Set<ModuleKey>([
        ...(Object.keys(existing) as ModuleKey[]),
        ...(Object.keys(next) as ModuleKey[]),
      ])
      for (const moduleKey of allModuleKeys) {
        if ((existing[moduleKey] ?? null) !== (next[moduleKey] ?? null)) {
          assertAdminOfModule(updatedBy, moduleKey)
        }
      }
    }
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
    if (removed.id === deletedBy) throw new Error('You cannot delete your own account')
    mockUsers.splice(idx, 1)
    recordAudit({
      userId: deletedBy,
      action: 'delete',
      module: 'Admin',
      detail: `Deleted user ${removed.name} (${removed.email})`,
    })
  },

  /**
   * Invite a user to a specific module at a given role. If the email already
   * exists, sets that user's role for the module; otherwise creates a new user
   * and grants access at the supplied role. Caller authorization (admin of the
   * target module) is enforced in the calling component.
   */
  inviteToModule: async (input: {
    name: string
    email: string
    phone?: string
    moduleKey: ModuleKey
    role?: ModuleRole
    auditModule: string
    invitedBy: string
  }): Promise<{ user: User; created: boolean }> => {
    await delay(120)
    assertAdminOfModule(input.invitedBy, input.moduleKey)
    const role: ModuleRole = input.role ?? 'member'
    const existing = mockUsers.find((u) => u.email.toLowerCase() === input.email.toLowerCase())
    if (existing) {
      if (existing.moduleRoles[input.moduleKey]) {
        throw new Error(`${existing.name} already has access to this module`)
      }
      existing.moduleRoles = { ...existing.moduleRoles, [input.moduleKey]: role }
      recordAudit({
        userId: input.invitedBy,
        action: 'update',
        module: input.auditModule,
        detail: `Granted ${existing.name} ${role} access`,
      })
      return { user: existing, created: false }
    }
    const u: User = {
      id: nextUserId(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      moduleRoles: { [input.moduleKey]: role },
    }
    mockUsers.push(u)
    recordAudit({
      userId: input.invitedBy,
      action: 'create',
      module: input.auditModule,
      detail: `Invited ${u.name} (${u.email}) as ${role}`,
    })
    return { user: u, created: true }
  },

  /**
   * Set a user's role in a specific module. Supplying `null` revokes access.
   * Demoting / removing the last admin of a module is refused so admin power
   * never gets orphaned. Self-revocation (revoking your own access to a module
   * you administer via this same module) is refused — use the Admin module
   * to manage your own access.
   */
  setModuleRole: async (input: {
    userId: string
    moduleKey: ModuleKey
    role: ModuleRole | null
    auditModule: string
    byId: string
  }): Promise<User> => {
    await delay(120)
    assertAdminOfModule(input.byId, input.moduleKey)
    const idx = mockUsers.findIndex((u) => u.id === input.userId)
    if (idx === -1) throw new Error(`User ${input.userId} not found`)
    const u = mockUsers[idx]
    const current = u.moduleRoles[input.moduleKey] ?? null

    if (current === input.role) {
      const verb = input.role === null ? 'have access to' : `be a ${input.role} of`
      throw new Error(`${u.name} doesn't ${verb} this module to change`)
    }

    // Guard: removing the last admin orphans admin power.
    if (current === 'admin' && input.role !== 'admin') {
      const otherAdmins = mockUsers.filter(
        (other) => other.id !== u.id && other.moduleRoles[input.moduleKey] === 'admin',
      )
      if (otherAdmins.length === 0) {
        throw new Error(`${u.name} is the last ${input.auditModule} admin — promote another user first`)
      }
    }

    // Guard: self-revoke from within a module you're managing.
    if (input.userId === input.byId && input.role === null) {
      throw new Error('You cannot revoke your own access')
    }

    const nextRoles = { ...u.moduleRoles }
    if (input.role === null) {
      delete nextRoles[input.moduleKey]
    } else {
      nextRoles[input.moduleKey] = input.role
    }
    u.moduleRoles = nextRoles

    const action =
      input.role === null
        ? `Revoked ${u.name}'s access`
        : current === null
        ? `Granted ${u.name} ${input.role} access`
        : `Changed ${u.name} from ${current} to ${input.role}`
    recordAudit({
      userId: input.byId,
      action: 'update',
      module: input.auditModule,
      detail: action,
    })
    return u
  },
}
