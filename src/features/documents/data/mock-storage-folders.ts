import type { StorageFolder } from '@/features/documents/types'

/**
 * Seed folders for demo accounts. The Admin user gets a nested tree so the
 * FolderTree component renders something interesting on first paint.
 */
export const mockStorageFolders: StorageFolder[] = [
  {
    id: 'FLD-0001',
    ownerName: 'Admin User',
    parentId: null,
    name: 'Contracts',
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-10T09:00:00Z',
  },
  {
    id: 'FLD-0002',
    ownerName: 'Admin User',
    parentId: 'FLD-0001',
    name: '2026 Q1',
    createdAt: '2026-04-10T09:05:00Z',
    updatedAt: '2026-04-10T09:05:00Z',
  },
  {
    id: 'FLD-0003',
    ownerName: 'Admin User',
    parentId: null,
    name: 'Engineering',
    createdAt: '2026-04-15T14:20:00Z',
    updatedAt: '2026-04-15T14:20:00Z',
  },
  {
    id: 'FLD-0004',
    ownerName: 'Admin User',
    parentId: 'FLD-0003',
    name: 'Standards',
    createdAt: '2026-04-15T14:25:00Z',
    updatedAt: '2026-04-15T14:25:00Z',
  },
  {
    id: 'FLD-0005',
    ownerName: 'Jane Doe',
    parentId: null,
    name: 'Daily handover',
    createdAt: '2026-04-28T07:35:00Z',
    updatedAt: '2026-04-28T07:35:00Z',
  },
  {
    id: 'FLD-0006',
    ownerName: 'Marcus Hale',
    parentId: null,
    name: 'Compliance',
    createdAt: '2026-05-04T13:25:00Z',
    updatedAt: '2026-05-04T13:25:00Z',
  },
]
