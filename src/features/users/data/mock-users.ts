import type { ModuleRole, User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'

const ALL_MODULES: ModuleKey[] = [
  'mis', 'sdms', 'inventory', 'assets', 'fleet',
  'procurement', 'maintenance',
]

/** Helper to fill the same role across many modules concisely. */
function rolesFor(role: ModuleRole, ...keys: ModuleKey[]): Partial<Record<ModuleKey, ModuleRole>> {
  return keys.reduce<Partial<Record<ModuleKey, ModuleRole>>>((acc, k) => {
    acc[k] = role
    return acc
  }, {})
}

export const mockUsers: User[] = [
  // Demo account 1: Platform admin (admin in every module).
  {
    id: 'U001',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+1 555 000 0001',
    employeeId: 'EMP-001',
    departmentId: 'D002',
    position: 'System Administrator',
    status: 'active',
    createdAt: '2025-01-15',
    moduleRoles: rolesFor('admin', ...ALL_MODULES),
  },
  // Demo account 2: Operations lead — mixed tiers across modules.
  {
    id: 'U002',
    name: 'Jane Doe',
    email: 'operations@example.com',
    phone: '+1 555 000 0002',
    employeeId: 'EMP-002',
    departmentId: 'D001',
    position: 'Operations Manager',
    status: 'active',
    createdAt: '2025-02-01',
    moduleRoles: {
      maintenance: 'admin',
      fleet: 'admin',
      inventory: 'manager',
      assets: 'manager',
      mis: 'member',
      sdms: 'member',
    },
  },
  {
    id: 'U003',
    name: 'John Smith',
    email: 'john@example.com',
    phone: '+1 555 000 0003',
    employeeId: 'EMP-003',
    departmentId: 'D002',
    position: 'IT Specialist',
    status: 'active',
    createdAt: '2024-11-05',
    moduleRoles: rolesFor('member', ...ALL_MODULES),
  },
  // Demo account 3: Domain specialist — admin of their own module.
  {
    id: 'U004',
    name: 'Marcus Hale',
    email: 'documents@example.com',
    phone: '+1 555 000 0004',
    employeeId: 'EMP-004',
    departmentId: 'D001',
    position: 'Document Controller',
    status: 'active',
    createdAt: '2025-02-10',
    moduleRoles: { sdms: 'admin', mis: 'manager' },
  },
  {
    id: 'U005',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 555 000 0005',
    employeeId: 'EMP-005',
    departmentId: 'D005',
    position: 'Procurement Officer',
    status: 'active',
    createdAt: '2025-03-01',
    moduleRoles: { procurement: 'manager', sdms: 'admin', mis: 'member' },
  },
  {
    id: 'U006',
    name: 'Mike Thompson',
    email: 'mike.thompson@example.com',
    phone: '+1 555 000 0006',
    employeeId: 'EMP-006',
    departmentId: 'D006',
    position: 'Maintenance Supervisor',
    status: 'active',
    createdAt: '2025-03-05',
    moduleRoles: { maintenance: 'manager', procurement: 'member', sdms: 'member', mis: 'member' },
  },
  {
    id: 'U007',
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '+1 555 000 0007',
    employeeId: 'EMP-007',
    departmentId: 'D005',
    position: 'Procurement Analyst',
    status: 'active',
    createdAt: '2025-03-12',
    moduleRoles: { procurement: 'member', inventory: 'member', sdms: 'member', mis: 'member' },
  },
  {
    id: 'U008',
    name: 'David Chen',
    email: 'david.chen@example.com',
    phone: '+1 555 000 0008',
    employeeId: 'EMP-008',
    departmentId: 'D002',
    position: 'Software Developer',
    status: 'active',
    createdAt: '2025-03-15',
    moduleRoles: { sdms: 'member', mis: 'member' },
  },
  // Demo account 4: Module-only admin — admin of one module without
  // touching others.
  {
    id: 'U009',
    name: 'Riley Ortiz',
    email: 'maintenance-admin@example.com',
    phone: '+1 555 000 0009',
    employeeId: 'EMP-009',
    departmentId: 'D006',
    position: 'Maintenance Lead',
    status: 'active',
    createdAt: '2025-04-01',
    moduleRoles: { maintenance: 'admin', mis: 'member' },
  },
  // Demo account 5: Manager-tier only — approver without admin powers.
  {
    id: 'U010',
    name: 'Priya Kapoor',
    email: 'procurement-manager@example.com',
    phone: '+1 555 000 0010',
    employeeId: 'EMP-010',
    departmentId: 'D005',
    position: 'Procurement Manager',
    status: 'active',
    createdAt: '2025-04-05',
    moduleRoles: { procurement: 'manager', mis: 'member' },
  },
]
