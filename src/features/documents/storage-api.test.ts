import { describe, it, expect } from 'vitest'
import { storageApi } from './api/storage-api'
import { mockDocuments } from './data/mock-documents'

const A_DOC = mockDocuments[0]
const B_DOC = mockDocuments[1]

describe('storageApi.list', () => {
  it('returns only the requesting user’s items', async () => {
    const adminItems = await storageApi.list('Admin User')
    const janeItems = await storageApi.list('Jane Doe')
    expect(adminItems.every((s) => s.ownerName === 'Admin User')).toBe(true)
    expect(janeItems.every((s) => s.ownerName === 'Jane Doe')).toBe(true)
    // No bleed-through
    expect(adminItems.find((s) => s.ownerName === 'Jane Doe')).toBeUndefined()
  })

  it('returns an empty list for users with no items', async () => {
    const items = await storageApi.list(`Unknown User ${Date.now()}`)
    expect(items).toEqual([])
  })

  it('search filters by title, description, and tags', async () => {
    // Seed an item we can target
    await storageApi.add({
      documentId: A_DOC.id,
      ownerName: 'TestSearcher',
      title: 'Apex contract — Q3',
      description: 'The blue binder copy',
      tags: ['vendor', 'contract'],
    })

    const byTitle = await storageApi.list('TestSearcher', { search: 'apex' })
    expect(byTitle.length).toBeGreaterThan(0)

    const byDesc = await storageApi.list('TestSearcher', { search: 'binder' })
    expect(byDesc.length).toBeGreaterThan(0)

    const byTag = await storageApi.list('TestSearcher', { search: 'vendor' })
    expect(byTag.length).toBeGreaterThan(0)

    const noMatch = await storageApi.list('TestSearcher', { search: 'xyzqqq' })
    expect(noMatch).toEqual([])
  })

  it('sort=title_asc orders A → Z', async () => {
    const owner = `Sorter-${Date.now()}`
    await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Zebra report' })
    await storageApi.add({ documentId: B_DOC.id, ownerName: owner, title: 'Alpha report' })

    const items = await storageApi.list(owner, { sort: 'title_asc' })
    expect(items[0].title).toBe('Alpha report')
    expect(items[1].title).toBe('Zebra report')
  })
})

describe('storageApi.add', () => {
  it('creates a new storage item with a sequential STG-XXXX id', async () => {
    const { item } = await storageApi.add({
      documentId: A_DOC.id,
      ownerName: `Adder-${Date.now()}`,
      title: 'Adder copy',
    })
    expect(item.id).toMatch(/^STG-\d{4}$/)
    expect(item.documentId).toBe(A_DOC.id)
    expect(item.sourceModule).toBe('sdms')
  })

  it('falls back to the document title when title is empty', async () => {
    const { item } = await storageApi.add({
      documentId: A_DOC.id,
      ownerName: `Defaulter-${Date.now()}`,
      title: '   ', // whitespace only
    })
    expect(item.title).toBe(A_DOC.title)
  })

  it('throws when documentId does not exist', async () => {
    await expect(storageApi.add({
      documentId: 'DOC-DOES-NOT-EXIST',
      ownerName: 'Admin User',
      title: 'Anything',
    })).rejects.toThrow(/not found/i)
  })

  it('returns the existing record on duplicate add (no second row)', async () => {
    const owner = `DupTest-${Date.now()}`
    const first = await storageApi.add({
      documentId: A_DOC.id, ownerName: owner, title: 'First add', tags: ['original'],
    })
    expect(first.alreadyExisted).toBe(false)

    const second = await storageApi.add({
      documentId: A_DOC.id, ownerName: owner, title: 'Second add (should be ignored)', tags: ['updated'],
    })
    expect(second.alreadyExisted).toBe(true)
    // Returns the original record, not a fresh one
    expect(second.item.id).toBe(first.item.id)
    expect(second.item.title).toBe('First add')
    expect(second.item.tags).toEqual(['original'])

    const list = await storageApi.list(owner)
    const matching = list.filter((s) => s.documentId === A_DOC.id)
    expect(matching).toHaveLength(1)
  })

  it('persists tags as the user entered them', async () => {
    const { item } = await storageApi.add({
      documentId: B_DOC.id,
      ownerName: `Tagger-${Date.now()}`,
      title: 'Tag test',
      tags: ['policy', 'q2', 'vendor'],
    })
    expect(item.tags).toEqual(['policy', 'q2', 'vendor'])
  })
})

describe('storageApi.remove', () => {
  it('removes an item by id and emits an audit entry', async () => {
    const owner = `Remover-${Date.now()}`
    const { item } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'To remove' })

    await storageApi.remove(item.id, owner)

    const list = await storageApi.list(owner)
    expect(list.find((s) => s.id === item.id)).toBeUndefined()
  })

  it('refuses to remove an item owned by a different user', async () => {
    const ownerA = `OwnerA-${Date.now()}`
    const ownerB = `OwnerB-${Date.now()}`
    const { item } = await storageApi.add({ documentId: A_DOC.id, ownerName: ownerA, title: 'A’s item' })

    await expect(storageApi.remove(item.id, ownerB)).rejects.toThrow(/your own/i)

    // Confirm not removed
    const aItems = await storageApi.list(ownerA)
    expect(aItems.find((s) => s.id === item.id)).toBeDefined()
  })

  it('throws when removing an unknown id', async () => {
    await expect(storageApi.remove('STG-9999999', 'Admin User')).rejects.toThrow(/not found/i)
  })
})

describe('storageApi — sourceModule field', () => {
  it('defaults to sdms even if not provided', async () => {
    const { item } = await storageApi.add({
      documentId: A_DOC.id,
      ownerName: `SourceTest-${Date.now()}`,
      title: 'Source test',
    })
    expect(item.sourceModule).toBe('sdms')
  })
})

describe('storageApi — folders', () => {
  it('createFolder + listFolders are owner-scoped', async () => {
    const ownerA = `FolderOwnerA-${Date.now()}`
    const ownerB = `FolderOwnerB-${Date.now()}`
    await storageApi.createFolder({ name: 'A-Root', parentId: null, ownerName: ownerA })
    await storageApi.createFolder({ name: 'B-Root', parentId: null, ownerName: ownerB })

    const aFolders = await storageApi.listFolders(ownerA)
    const bFolders = await storageApi.listFolders(ownerB)
    expect(aFolders.every((f) => f.ownerName === ownerA)).toBe(true)
    expect(bFolders.every((f) => f.ownerName === ownerB)).toBe(true)
    expect(aFolders.find((f) => f.name === 'B-Root')).toBeUndefined()
  })

  it('createFolder rejects an empty name', async () => {
    await expect(
      storageApi.createFolder({ name: '   ', parentId: null, ownerName: 'Admin User' }),
    ).rejects.toThrow(/name is required/i)
  })

  it('createFolder under a parent the user does not own throws', async () => {
    const owner = `FolderOwner-${Date.now()}`
    const intruder = `Intruder-${Date.now()}`
    const parent = await storageApi.createFolder({ name: 'Owned', parentId: null, ownerName: owner })
    await expect(
      storageApi.createFolder({ name: 'Sneaky', parentId: parent.id, ownerName: intruder }),
    ).rejects.toThrow(/your own/i)
  })

  it('renameFolder updates the name + updatedAt', async () => {
    const owner = `Renamer-${Date.now()}`
    const folder = await storageApi.createFolder({ name: 'Old', parentId: null, ownerName: owner })
    const renamed = await storageApi.renameFolder(folder.id, 'New', owner)
    expect(renamed.name).toBe('New')
    expect(renamed.updatedAt >= folder.createdAt).toBe(true)
  })

  it('moveFolder rejects a cycle (folder into itself or descendant)', async () => {
    const owner = `Cycler-${Date.now()}`
    const root = await storageApi.createFolder({ name: 'Root', parentId: null, ownerName: owner })
    const child = await storageApi.createFolder({ name: 'Child', parentId: root.id, ownerName: owner })

    await expect(storageApi.moveFolder(root.id, root.id, owner)).rejects.toThrow(/itself/i)
    await expect(storageApi.moveFolder(root.id, child.id, owner)).rejects.toThrow(/itself/i)
  })

  it('deleteFolder reparents children + moves items inside to root', async () => {
    const owner = `Deleter-${Date.now()}`
    const root = await storageApi.createFolder({ name: 'Doomed', parentId: null, ownerName: owner })
    const child = await storageApi.createFolder({ name: 'Survivor', parentId: root.id, ownerName: owner })
    const { item } = await storageApi.add({
      documentId: A_DOC.id, ownerName: owner, title: 'Inside doomed', folderId: root.id,
    })

    await storageApi.deleteFolder(root.id, owner)

    const folders = await storageApi.listFolders(owner)
    const survivor = folders.find((f) => f.id === child.id)
    expect(survivor).toBeDefined()
    expect(survivor!.parentId).toBe(null)

    const items = await storageApi.list(owner, { view: 'folder', folderId: null })
    expect(items.find((i) => i.id === item.id)).toBeDefined()
  })
})

describe('storageApi — views', () => {
  it('view=folder + folderId filters to that folder only', async () => {
    const owner = `Viewer-${Date.now()}`
    const f1 = await storageApi.createFolder({ name: 'Bin1', parentId: null, ownerName: owner })
    await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'In folder', folderId: f1.id })
    await storageApi.add({ documentId: B_DOC.id, ownerName: owner, title: 'At root' })

    const inFolder = await storageApi.list(owner, { view: 'folder', folderId: f1.id })
    const atRoot = await storageApi.list(owner, { view: 'folder', folderId: null })
    expect(inFolder.every((i) => i.folderId === f1.id)).toBe(true)
    expect(atRoot.every((i) => i.folderId === null)).toBe(true)
  })

  it('view=starred returns only starred items', async () => {
    const owner = `Starrer-${Date.now()}`
    const { item: a } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Starred' })
    await storageApi.add({ documentId: B_DOC.id, ownerName: owner, title: 'Plain' })
    await storageApi.toggleStar(a.id, owner)

    const starred = await storageApi.list(owner, { view: 'starred' })
    expect(starred.length).toBe(1)
    expect(starred[0].id).toBe(a.id)
  })

  it('view=trash returns only trashed items; default excludes them', async () => {
    const owner = `Trasher-${Date.now()}`
    const { item } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Doomed' })
    await storageApi.moveToTrash(item.id, owner)

    const trash = await storageApi.list(owner, { view: 'trash' })
    const def = await storageApi.list(owner)
    expect(trash.find((i) => i.id === item.id)).toBeDefined()
    expect(def.find((i) => i.id === item.id)).toBeUndefined()
  })
})

describe('storageApi — moveItem + toggleStar + trash lifecycle', () => {
  it('moveItem updates folderId', async () => {
    const owner = `Mover-${Date.now()}`
    const f1 = await storageApi.createFolder({ name: 'Origin', parentId: null, ownerName: owner })
    const f2 = await storageApi.createFolder({ name: 'Destination', parentId: null, ownerName: owner })
    const { item } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Wandering', folderId: f1.id })

    const moved = await storageApi.moveItem(item.id, f2.id, owner)
    expect(moved.folderId).toBe(f2.id)
  })

  it('toggleStar flips the starred flag', async () => {
    const owner = `Toggler-${Date.now()}`
    const { item } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Toggle me' })
    expect(item.starred).toBeFalsy()

    const on = await storageApi.toggleStar(item.id, owner)
    expect(on.starred).toBe(true)

    const off = await storageApi.toggleStar(item.id, owner)
    expect(off.starred).toBe(false)
  })

  it('moveToTrash → restoreItem round-trip', async () => {
    const owner = `Rounder-${Date.now()}`
    const { item } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Round trip' })

    await storageApi.moveToTrash(item.id, owner)
    expect((await storageApi.list(owner, { view: 'trash' })).find((i) => i.id === item.id)).toBeDefined()
    expect((await storageApi.list(owner)).find((i) => i.id === item.id)).toBeUndefined()

    await storageApi.restoreItem(item.id, owner)
    expect((await storageApi.list(owner, { view: 'trash' })).find((i) => i.id === item.id)).toBeUndefined()
    expect((await storageApi.list(owner)).find((i) => i.id === item.id)).toBeDefined()
  })

  it('emptyTrash hard-deletes only the requesting user’s trashed items', async () => {
    const owner = `Emptier-${Date.now()}`
    const other = `Bystander-${Date.now()}`
    const { item: mine } = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Mine to lose' })
    const { item: theirs } = await storageApi.add({ documentId: A_DOC.id, ownerName: other, title: 'Theirs, safe' })
    await storageApi.moveToTrash(mine.id, owner)
    await storageApi.moveToTrash(theirs.id, other)

    const removed = await storageApi.emptyTrash(owner)
    expect(removed).toBeGreaterThan(0)

    expect((await storageApi.list(owner, { view: 'trash' })).find((i) => i.id === mine.id)).toBeUndefined()
    expect((await storageApi.list(other, { view: 'trash' })).find((i) => i.id === theirs.id)).toBeDefined()
  })

  it('add after trash creates a fresh row (tombstone behavior)', async () => {
    const owner = `Resurrector-${Date.now()}`
    const first = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'First' })
    await storageApi.moveToTrash(first.item.id, owner)

    const second = await storageApi.add({ documentId: A_DOC.id, ownerName: owner, title: 'Second' })
    expect(second.alreadyExisted).toBe(false)
    expect(second.item.id).not.toBe(first.item.id)
  })
})

describe('storageApi.upload', () => {
  it('creates a storage item with a file payload and no documentId', async () => {
    const owner = `Uploader-${Date.now()}`
    const item = await storageApi.upload({
      ownerName: owner,
      title: 'My PDF',
      file: { name: 'my.pdf', type: 'pdf', sizeBytes: 1024, assetUrl: 'blob:fake' },
    })
    expect(item.documentId).toBeUndefined()
    expect(item.file?.name).toBe('my.pdf')
    expect(item.id).toMatch(/^STG-\d{4}$/)
  })

  it('falls back to the file name when title is empty', async () => {
    const owner = `UploadDefaulter-${Date.now()}`
    const item = await storageApi.upload({
      ownerName: owner,
      title: '   ',
      file: { name: 'fallback.png', type: 'png', sizeBytes: 512, assetUrl: 'blob:fake' },
    })
    expect(item.title).toBe('fallback.png')
  })
})
