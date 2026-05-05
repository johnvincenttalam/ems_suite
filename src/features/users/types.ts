import type { ModuleKey } from '@/config/modules'

export type UserRole = 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  status: 'active' | 'inactive'
  createdAt: string
  /** Modules this user can access. An empty list means no module access. */
  modules: ModuleKey[]
  /** Modules this user can administer (invite users, grant/revoke access,
   * toggle status). Subset of `modules`. Empty when the user is a regular
   * member of every module they belong to. */
  moduleAdmins: ModuleKey[]
}
