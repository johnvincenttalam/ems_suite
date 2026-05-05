import type { User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'

export function hasModuleAccess(user: User | null | undefined, moduleKey: ModuleKey): boolean {
  if (!user) return false
  return user.modules.includes(moduleKey)
}
