import type { SourceModule, StorageItem } from '@/features/documents/types'
import { mockStorageItems } from '@/features/documents/data/mock-storage-items'
import { mockDocuments } from '@/features/documents/data/mock-documents'
import { recordAudit } from '@/features/audit-log/lib/audit-emitter'
// import { http } from '@/shared/lib/http'

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? Math.random() * 300 + 150))

let storageCounter = mockStorageItems.reduce((max, s) => {
  const n = Number(s.id.replace(/^STG-/, ''))
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextStorageId(): string {
  storageCounter += 1
  return `STG-${String(storageCounter).padStart(4, '0')}`
}

export type StorageSort = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'

interface ListStorageOpts {
  search?: string
  sort?: StorageSort
}

interface AddStorageInput {
  documentId: string
  ownerName: string
  title: string
  description?: string
  tags?: string[]
  sourceModule?: SourceModule
}

interface AddStorageResult {
  item: StorageItem
  /** True when the user already had this document in storage; the existing
   * record is returned instead of creating a duplicate. */
  alreadyExisted: boolean
}

/**
 * Storage API — Phase 1 reference-only. Mutations operate on in-memory mock
 * arrays; React Query consumers re-fetch via `invalidateQueries(['storage', ...])`.
 *
 * Authorization model: `ownerName` scopes every operation. List / remove use
 * it as a filter; the real backend would derive it from session and never
 * trust client-side input. The mock leaves it explicit so tests can exercise
 * cross-user isolation without a separate auth fixture.
 */
export const storageApi = {
  /** List the signed-in user's storage items, with optional search + sort. */
  list: async (ownerName: string, opts: ListStorageOpts = {}): Promise<StorageItem[]> => {
    await delay()
    let rows = mockStorageItems.filter((s) => s.ownerName === ownerName)

    if (opts.search?.trim()) {
      const q = opts.search.toLowerCase()
      rows = rows.filter((s) => {
        const haystack = [s.title, s.description, ...s.tags].join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    const sort = opts.sort ?? 'date_desc'
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'date_asc':  return a.createdAt.localeCompare(b.createdAt)
        case 'title_asc': return a.title.localeCompare(b.title)
        case 'title_desc': return b.title.localeCompare(a.title)
        case 'date_desc':
        default:          return b.createdAt.localeCompare(a.createdAt)
      }
    })
    return rows
  },

  /**
   * Bookmark a document. Per the duplicate-add policy, if the user already
   * has this document in their vault we surface the existing record rather
   * than creating a second row. Adds an audit log entry.
   */
  add: async (input: AddStorageInput): Promise<AddStorageResult> => {
    await delay(180)

    const doc = mockDocuments.find((d) => d.id === input.documentId)
    if (!doc) throw new Error(`Document ${input.documentId} not found`)

    const existing = mockStorageItems.find(
      (s) => s.ownerName === input.ownerName && s.documentId === input.documentId,
    )
    if (existing) {
      return { item: existing, alreadyExisted: true }
    }

    const now = new Date().toISOString()
    const item: StorageItem = {
      id: nextStorageId(),
      documentId: input.documentId,
      ownerName: input.ownerName,
      title: input.title.trim() || doc.title,
      description: input.description?.trim() ?? '',
      tags: input.tags ?? [],
      sourceModule: input.sourceModule ?? 'sdms',
      createdAt: now,
      updatedAt: now,
    }
    mockStorageItems.push(item)

    recordAudit({
      userId: input.ownerName,
      action: 'create',
      module: 'Documents',
      detail: `Added ${doc.id} (${doc.title}) to storage`,
    })

    return { item, alreadyExisted: false }
  },

  /**
   * Remove a storage item. Owner-scoped: if the requesting user isn't the
   * owner of the record, the operation throws. The mock array is mutated in
   * place; React Query invalidation handles the refresh.
   */
  remove: async (id: string, ownerName: string): Promise<void> => {
    await delay(120)
    const idx = mockStorageItems.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`Storage item ${id} not found`)
    if (mockStorageItems[idx].ownerName !== ownerName) {
      throw new Error('You can only remove your own storage items')
    }

    const removed = mockStorageItems[idx]
    mockStorageItems.splice(idx, 1)

    recordAudit({
      userId: ownerName,
      action: 'delete',
      module: 'Documents',
      detail: `Removed ${removed.title} from storage`,
    })
  },
}
