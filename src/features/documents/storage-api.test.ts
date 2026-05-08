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
