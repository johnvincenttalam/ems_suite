import type { StorageItem } from '@/features/documents/types'

/**
 * Seed storage items spread across demo accounts so each user lands on a
 * non-empty My Storage page on first paint. Per the Phase 1 spec, all
 * sourceModule values are 'sdms'. A few items live inside folders so the
 * tree view exercises both root + nested rendering on first paint; one is
 * starred so the Starred virtual view isn't empty.
 */
export const mockStorageItems: StorageItem[] = [
  {
    id: 'STG-0001',
    documentId: 'DOC-001',
    ownerName: 'Admin User',
    title: 'Q1 Vendor MSA — bookmarked',
    description: 'Reference copy for the procurement audit walkthrough.',
    tags: ['vendor', 'reference', 'q1'],
    sourceModule: 'sdms',
    folderId: 'FLD-0002',
    starred: true,
    createdAt: '2026-04-22T09:14:00Z',
    updatedAt: '2026-04-22T09:14:00Z',
  },
  {
    id: 'STG-0002',
    documentId: 'DOC-003',
    ownerName: 'Admin User',
    title: 'Engineering Standards Manual',
    description: '',
    tags: ['standards', 'engineering'],
    sourceModule: 'sdms',
    folderId: 'FLD-0004',
    createdAt: '2026-04-25T11:02:00Z',
    updatedAt: '2026-04-25T11:02:00Z',
  },
  {
    id: 'STG-0003',
    documentId: 'DOC-002',
    ownerName: 'Jane Doe',
    title: 'Operations SOP — daily reference',
    description: 'Pinned for daily handover.',
    tags: ['sop', 'operations', 'daily'],
    sourceModule: 'sdms',
    folderId: 'FLD-0005',
    starred: true,
    createdAt: '2026-04-28T07:40:00Z',
    updatedAt: '2026-05-01T14:20:00Z',
  },
  {
    id: 'STG-0004',
    documentId: 'DOC-004',
    ownerName: 'Marcus Hale',
    title: 'Compliance Bulletin — May 2026',
    description: 'Distributed copy for the records team.',
    tags: ['compliance', 'bulletin', 'may-2026'],
    sourceModule: 'sdms',
    folderId: 'FLD-0006',
    createdAt: '2026-05-04T13:30:00Z',
    updatedAt: '2026-05-04T13:30:00Z',
  },
  {
    id: 'STG-0005',
    documentId: 'DOC-005',
    ownerName: 'Marcus Hale',
    title: 'Quarterly HR Policy',
    description: '',
    tags: ['hr', 'policy'],
    sourceModule: 'sdms',
    folderId: null,
    createdAt: '2026-05-06T08:15:00Z',
    updatedAt: '2026-05-06T08:15:00Z',
  },
]
