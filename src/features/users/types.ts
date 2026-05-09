import type { ModuleKey } from '@/config/modules'

export type UserRole = 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  employeeId?: string
  departmentId?: string
  position?: string
  status: 'active' | 'inactive'
  /** Driver's license expiry (ISO yyyy-mm-dd). Optional — only set on users
   * who drive fleet vehicles. Surfaced by the Fleet dashboard's expiry watch. */
  licenseExpiry?: string
  createdAt: string
  /** Modules this user can access. An empty list means no module access. */
  modules: ModuleKey[]
  /** Modules this user can administer (invite users, grant/revoke access,
   * toggle status). Subset of `modules`. Empty when the user is a regular
   * member of every module they belong to. */
  moduleAdmins: ModuleKey[]
}
