import type { User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'

export function hasModuleAccess(user: User | null | undefined, moduleKey: ModuleKey): boolean {
  if (!user) return false
  return user.modules.includes(moduleKey)
}

/** True when the user is allowed to administer the given module — invite users,
 * grant/revoke access, toggle status. Independent of `hasModuleAccess` (a user
 * can technically be a module admin without belonging to that module's nav,
 * though seeded data always co-locates the two). */
export function isModuleAdmin(user: User | null | undefined, moduleKey: ModuleKey): boolean {
  if (!user) return false
  return user.moduleAdmins?.includes(moduleKey) ?? false
}
