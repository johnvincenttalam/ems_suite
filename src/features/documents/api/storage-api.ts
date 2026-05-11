import type {
  DocumentFileType,
  SourceModule,
  StorageFolder,
  StorageItem,
  StorageUploadedFile,
} from '@/features/documents/types'
import { mockStorageItems } from '@/features/documents/data/mock-storage-items'
import { mockStorageFolders } from '@/features/documents/data/mock-storage-folders'
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

let folderCounter = mockStorageFolders.reduce((max, f) => {
  const n = Number(f.id.replace(/^FLD-/, ''))
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextFolderId(): string {
  folderCounter += 1
  return `FLD-${String(folderCounter).padStart(4, '0')}`
}

export type StorageSort = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'

/** Virtual views that aren't backed by a real folder. */
export type StorageView = 'folder' | 'recent' | 'starred' | 'trash' | 'all'

interface ListStorageOpts {
  search?: string
  sort?: StorageSort
  /** Defaults to 'all' for backward compatibility — returns every non-trashed
   * item the user owns regardless of folder. */
  view?: StorageView
  /** Only consulted when `view === 'folder'`. null = root. */
  folderId?: string | null
  /** Cap for the 'recent' view. Ignored for other views. */
  recentLimit?: number
}

interface AddStorageInput {
  documentId: string
  ownerName: string
  title: string
  description?: string
  tags?: string[]
  sourceModule?: SourceModule
  folderId?: string | null
}

interface AddStorageResult {
  item: StorageItem
  /** True when the user already had this document in storage; the existing
   * record is returned instead of creating a duplicate. Trashed records are
   * NOT considered existing — they're tombstoned. */
  alreadyExisted: boolean
}

interface UploadStorageInput {
  ownerName: string
  title: string
  description?: string
  tags?: string[]
  folderId?: string | null
  file: StorageUploadedFile
}

function ownedFolder(id: string, ownerName: string): StorageFolder {
  const folder = mockStorageFolders.find((f) => f.id === id)
  if (!folder) throw new Error(`Folder ${id} not found`)
  if (folder.ownerName !== ownerName) {
    throw new Error('You can only operate on your own folders')
  }
  return folder
}

function ownedItem(id: string, ownerName: string): StorageItem {
  const item = mockStorageItems.find((s) => s.id === id)
  if (!item) throw new Error(`Storage item ${id} not found`)
  if (item.ownerName !== ownerName) {
    throw new Error('You can only operate on your own storage items')
  }
  return item
}

/** Reject a folder move that would create a cycle (folder being moved into
 * itself or any of its own descendants). */
function isDescendantOf(folderId: string, ancestorId: string): boolean {
  if (folderId === ancestorId) return true
  const folder = mockStorageFolders.find((f) => f.id === folderId)
  if (!folder || folder.parentId === null) return false
  return isDescendantOf(folder.parentId, ancestorId)
}

function applySort(rows: StorageItem[], sort: StorageSort): StorageItem[] {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case 'date_asc':  return a.createdAt.localeCompare(b.createdAt)
      case 'title_asc': return a.title.localeCompare(b.title)
      case 'title_desc': return b.title.localeCompare(a.title)
      case 'date_desc':
      default:          return b.createdAt.localeCompare(a.createdAt)
    }
  })
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
  /** List the signed-in user's storage items, with optional search + sort
   * + view scoping. Excludes trashed items unless `view === 'trash'`. */
  list: async (ownerName: string, opts: ListStorageOpts = {}): Promise<StorageItem[]> => {
    await delay()
    const view: StorageView = opts.view ?? 'all'

    let rows = mockStorageItems.filter((s) => s.ownerName === ownerName)

    if (view === 'trash') {
      rows = rows.filter((s) => !!s.deletedAt)
    } else {
      rows = rows.filter((s) => !s.deletedAt)
      if (view === 'folder') {
        const target = opts.folderId ?? null
        rows = rows.filter((s) => (s.folderId ?? null) === target)
      } else if (view === 'starred') {
        rows = rows.filter((s) => !!s.starred)
      }
      // 'recent' and 'all' don't constrain by folder
    }

    if (opts.search?.trim()) {
      const q = opts.search.toLowerCase()
      rows = rows.filter((s) => {
        const haystack = [s.title, s.description, ...s.tags].join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    if (view === 'recent') {
      const sorted = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      return sorted.slice(0, opts.recentLimit ?? 20)
    }

    return applySort(rows, opts.sort ?? 'date_desc')
  },

  /** List the signed-in user's folders. The tree is built client-side from
   * the flat list — folders carry their `parentId` and the consumer threads
   * them. */
  listFolders: async (ownerName: string): Promise<StorageFolder[]> => {
    await delay(120)
    return mockStorageFolders
      .filter((f) => f.ownerName === ownerName)
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  /** Create a folder under `parentId` (null = root). The owner must own the
   * parent. */
  createFolder: async (input: {
    name: string
    parentId: string | null
    ownerName: string
  }): Promise<StorageFolder> => {
    await delay(140)
    const name = input.name.trim()
    if (!name) throw new Error('Folder name is required')

    if (input.parentId !== null) {
      ownedFolder(input.parentId, input.ownerName)
    }

    const now = new Date().toISOString()
    const folder: StorageFolder = {
      id: nextFolderId(),
      ownerName: input.ownerName,
      parentId: input.parentId,
      name,
      createdAt: now,
      updatedAt: now,
    }
    mockStorageFolders.push(folder)

    recordAudit({
      userId: input.ownerName,
      action: 'create',
      module: 'Documents',
      detail: `Created storage folder "${name}"`,
    })

    return folder
  },

  renameFolder: async (id: string, name: string, ownerName: string): Promise<StorageFolder> => {
    await delay(120)
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Folder name is required')

    const folder = ownedFolder(id, ownerName)
    const prev = folder.name
    folder.name = trimmed
    folder.updatedAt = new Date().toISOString()

    recordAudit({
      userId: ownerName,
      action: 'update',
      module: 'Documents',
      detail: `Renamed storage folder "${prev}" → "${trimmed}"`,
    })

    return folder
  },

  moveFolder: async (id: string, newParentId: string | null, ownerName: string): Promise<StorageFolder> => {
    await delay(140)
    const folder = ownedFolder(id, ownerName)

    if (newParentId !== null) {
      ownedFolder(newParentId, ownerName)
      if (isDescendantOf(newParentId, id)) {
        throw new Error('Cannot move a folder into itself or one of its subfolders')
      }
    }

    folder.parentId = newParentId
    folder.updatedAt = new Date().toISOString()
    return folder
  },

  /** Hard-delete a folder. Items inside fall back to root (`folderId: null`)
   * rather than being trashed. Child folders move up to the deleted folder's
   * parent so the tree stays connected. */
  deleteFolder: async (id: string, ownerName: string): Promise<void> => {
    await delay(160)
    const folder = ownedFolder(id, ownerName)
    const parentId = folder.parentId

    // Reparent children up one level
    for (const child of mockStorageFolders) {
      if (child.parentId === id) {
        child.parentId = parentId
        child.updatedAt = new Date().toISOString()
      }
    }

    // Move items inside to root
    for (const item of mockStorageItems) {
      if (item.folderId === id) {
        item.folderId = null
        item.updatedAt = new Date().toISOString()
      }
    }

    const idx = mockStorageFolders.findIndex((f) => f.id === id)
    if (idx !== -1) mockStorageFolders.splice(idx, 1)

    recordAudit({
      userId: ownerName,
      action: 'delete',
      module: 'Documents',
      detail: `Deleted storage folder "${folder.name}"`,
    })
  },

  /**
   * Bookmark a document. Per the duplicate-add policy, if the user already
   * has an ACTIVE record for this document we surface it rather than creating
   * a second row. Trashed records don't count — adding again after trashing
   * creates a fresh row.
   */
  add: async (input: AddStorageInput): Promise<AddStorageResult> => {
    await delay(180)

    const doc = mockDocuments.find((d) => d.id === input.documentId)
    if (!doc) throw new Error(`Document ${input.documentId} not found`)

    if (input.folderId != null) {
      ownedFolder(input.folderId, input.ownerName)
    }

    const existing = mockStorageItems.find(
      (s) =>
        s.ownerName === input.ownerName &&
        s.documentId === input.documentId &&
        !s.deletedAt,
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
      folderId: input.folderId ?? null,
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
   * Upload a file directly into Storage. No backing SDMS document is
   * created — the file payload travels with the storage item via the `file`
   * field. Phase 1: the caller is responsible for producing an `assetUrl`
   * (data URL or blob URL from `URL.createObjectURL`).
   */
  upload: async (input: UploadStorageInput): Promise<StorageItem> => {
    await delay(220)

    if (input.folderId != null) {
      ownedFolder(input.folderId, input.ownerName)
    }

    const now = new Date().toISOString()
    const item: StorageItem = {
      id: nextStorageId(),
      file: input.file,
      ownerName: input.ownerName,
      title: input.title.trim() || input.file.name,
      description: input.description?.trim() ?? '',
      tags: input.tags ?? [],
      sourceModule: 'sdms',
      folderId: input.folderId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    mockStorageItems.push(item)

    recordAudit({
      userId: input.ownerName,
      action: 'create',
      module: 'Documents',
      detail: `Uploaded "${input.file.name}" to storage`,
    })

    return item
  },

  moveItem: async (id: string, newFolderId: string | null, ownerName: string): Promise<StorageItem> => {
    await delay(120)
    const item = ownedItem(id, ownerName)
    if (newFolderId !== null) {
      ownedFolder(newFolderId, ownerName)
    }
    item.folderId = newFolderId
    item.updatedAt = new Date().toISOString()
    return item
  },

  toggleStar: async (id: string, ownerName: string): Promise<StorageItem> => {
    await delay(80)
    const item = ownedItem(id, ownerName)
    item.starred = !item.starred
    item.updatedAt = new Date().toISOString()
    return item
  },

  /** Soft-delete: marks the item as in trash. The original record stays so
   * it can be restored. Use `remove` for unconditional hard-delete. */
  moveToTrash: async (id: string, ownerName: string): Promise<StorageItem> => {
    await delay(120)
    const item = ownedItem(id, ownerName)
    item.deletedAt = new Date().toISOString()
    item.updatedAt = item.deletedAt

    recordAudit({
      userId: ownerName,
      action: 'delete',
      module: 'Documents',
      detail: `Moved "${item.title}" to trash`,
    })

    return item
  },

  restoreItem: async (id: string, ownerName: string): Promise<StorageItem> => {
    await delay(120)
    const item = ownedItem(id, ownerName)
    item.deletedAt = null
    item.updatedAt = new Date().toISOString()

    recordAudit({
      userId: ownerName,
      action: 'update',
      module: 'Documents',
      detail: `Restored "${item.title}" from trash`,
    })

    return item
  },

  /** Hard-delete every trashed item owned by the user. */
  emptyTrash: async (ownerName: string): Promise<number> => {
    await delay(180)
    let removed = 0
    for (let i = mockStorageItems.length - 1; i >= 0; i -= 1) {
      const it = mockStorageItems[i]
      if (it.ownerName === ownerName && it.deletedAt) {
        mockStorageItems.splice(i, 1)
        removed += 1
      }
    }
    if (removed > 0) {
      recordAudit({
        userId: ownerName,
        action: 'delete',
        module: 'Documents',
        detail: `Emptied trash (${removed} item${removed === 1 ? '' : 's'})`,
      })
    }
    return removed
  },

  /**
   * Hard-remove a storage item. Owner-scoped: if the requesting user isn't
   * the owner of the record, the operation throws. Prefer `moveToTrash` for
   * user-facing delete — this stays for unconditional removal (e.g., empty
   * trash internals and back-compat with the original API).
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

export type { DocumentFileType }
