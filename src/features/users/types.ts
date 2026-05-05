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
}
