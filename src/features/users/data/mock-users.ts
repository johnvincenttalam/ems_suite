import type { User } from '@/features/users/types'
import type { ModuleKey } from '@/config/modules'

const ALL_MODULES: ModuleKey[] = [
  'mis', 'sdms', 'inventory', 'assets', 'fleet',
  'procurement', 'maintenance', 'admin',
]

export const mockUsers: User[] = [
  {
    id: 'U001',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    phone: '+1 555 000 0001',
    status: 'active',
    createdAt: '2025-01-15',
    modules: ALL_MODULES,
  },
  {
    id: 'U002',
    name: 'Jane Doe',
    email: 'operations@example.com',
    role: 'admin',
    phone: '+1 555 000 0002',
    status: 'active',
    createdAt: '2025-02-01',
    modules: ['mis', 'inventory', 'assets', 'fleet', 'maintenance'],
  },
  {
    id: 'U003',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'admin',
    phone: '+1 555 000 0003',
    status: 'inactive',
    createdAt: '2024-11-05',
    modules: ALL_MODULES,
  },
  {
    id: 'U004',
    name: 'Marcus Hale',
    email: 'documents@example.com',
    role: 'admin',
    phone: '+1 555 000 0004',
    status: 'active',
    createdAt: '2025-02-10',
    modules: ['mis', 'sdms'],
  },
]
