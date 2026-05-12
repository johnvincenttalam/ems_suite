import type { ModuleKey } from '@/config/modules'

/**
 * Role a user holds within a single module. Hierarchical:
 *   admin > manager > member
 *
 *  - admin:   manages module settings, role assignments, and admin-only
 *             actions (e.g. user grants, hard deletes). The Admin module's
 *             admins manage the user registry itself; there is no global
 *             super-admin role.
 *  - manager: reviews / approves / oversees work in that module (PO
 *             approvers, disposal approvers, transfer approvers, etc.).
 *  - member:  day-to-day operator. Can create, view, and act on records
 *             that don't require approval.
 */
export type ModuleRole = 'admin' | 'manager' | 'member'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  phone?: string
  employeeId?: string
  departmentId?: string
  position?: string
  status: 'active' | 'inactive'
  createdAt: string
  /**
   * Per-module role assignments. Presence of a key means the user has
   * access to that module; the value is their role within it.
   *
   * Replaces three pre-refactor fields: `role`, `modules`, `moduleAdmins`.
   */
  moduleRoles: Partial<Record<ModuleKey, ModuleRole>>
}
