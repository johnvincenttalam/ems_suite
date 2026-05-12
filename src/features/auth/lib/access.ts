import type { ModuleRole, User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'

/** True iff the user has any role in the given module. */
export function hasModuleAccess(user: User | null | undefined, moduleKey: ModuleKey): boolean {
  if (!user) return false
  return !!user.moduleRoles?.[moduleKey]
}

/** Role the user holds in the given module, or null if they have no access. */
export function moduleRoleOf(
  user: User | null | undefined,
  moduleKey: ModuleKey,
): ModuleRole | null {
  if (!user) return null
  return user.moduleRoles?.[moduleKey] ?? null
}

/** Admins manage the module: settings, role assignments, admin-only actions. */
export function isModuleAdmin(user: User | null | undefined, moduleKey: ModuleKey): boolean {
  return moduleRoleOf(user, moduleKey) === 'admin'
}

/** Manager-or-above gates approval/review actions. */
export function isModuleManagerOrAbove(
  user: User | null | undefined,
  moduleKey: ModuleKey,
): boolean {
  const role = moduleRoleOf(user, moduleKey)
  return role === 'admin' || role === 'manager'
}

/** Returns just the modules the user has access to (any role). Convenience for
 * UI that previously read `user.modules`. */
export function userModules(user: User | null | undefined): ModuleKey[] {
  if (!user) return []
  return Object.keys(user.moduleRoles ?? {}) as ModuleKey[]
}
