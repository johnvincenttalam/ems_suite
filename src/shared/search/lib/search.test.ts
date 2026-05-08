import { describe, it, expect } from 'vitest'
import { scoreFields, tokenize } from './types'
import { highlightSpans } from './highlight'
import { scoreDocuments } from './score-documents'
import { scoreProcurementRequests } from './score-procurement'
import { scoreWorkOrders } from './score-work-orders'
import { scoreInventoryItems } from './score-inventory'
import { scoreAssets } from './score-assets'
import type { AppDocument } from '@/features/documents'
import type { RequestWithItems } from '@/features/procurement'
import type { WorkOrder } from '@/features/maintenance'
import type { InventoryItem } from '@/features/inventory'
import type { Asset } from '@/features/assets'

describe('tokenize', () => {
  it('lowercases and splits on whitespace and commas', () => {
    expect(tokenize('Foo Bar, BAZ')).toEqual(['foo', 'bar', 'baz'])
  })

  it('returns empty for whitespace-only input', () => {
    expect(tokenize('   ')).toEqual([])
  })
})

describe('scoreFields', () => {
  it('AND semantics — every token must hit a field', () => {
    const r = scoreFields(['foo', 'bar'], [
      { text: 'foo bar baz', weight: 1 },
    ])
    expect(r.matched).toBe(true)
    expect(r.score).toBe(2)
  })

  it('rejects when a token is missing', () => {
    const r = scoreFields(['foo', 'qux'], [
      { text: 'foo bar baz', weight: 1 },
    ])
    expect(r.matched).toBe(false)
    expect(r.score).toBe(0)
  })

  it('sums per-field weights', () => {
    const r = scoreFields(['foo'], [
      { text: 'foo', weight: 5 },
      { text: 'foo bar', weight: 2 },
    ])
    expect(r.score).toBe(7)
  })
})

describe('highlightSpans', () => {
  it('case-insensitive token splitting', () => {
    expect(highlightSpans('Foo bar', ['foo'])).toEqual(['', 'Foo', ' bar'])
  })

  it('escapes regex special characters', () => {
    expect(highlightSpans('a.b', ['.'])).toContain('.')
  })

  it('returns the original text when no tokens match', () => {
    expect(highlightSpans('hello', ['x'])).toEqual(['hello'])
  })
})

const docFixture = (p: Partial<AppDocument>): AppDocument => ({
  id: 'DOC-X',
  title: 'X',
  fileName: 'x.pdf',
  fileType: 'pdf',
  fileSizeBytes: 1000,
  status: 'draft',
  version: 1,
  approvers: [],
  signatures: [],
  createdBy: 'U001',
  createdAt: '2026-04-01T00:00:00Z',
  ...p,
})

describe('scoreDocuments', () => {
  it('matches title and tags with weighted ranking', () => {
    const docs = [
      docFixture({ id: 'A', title: 'Procurement Policy 2026', tags: ['policy'] }),
      docFixture({ id: 'B', title: 'Vendor MSA', description: 'mentions procurement' }),
    ]
    const hits = scoreDocuments(docs, 'procurement')
    expect(hits[0].id).toBe('document:A')
    expect(hits[1].id).toBe('document:B')
  })

  it('matches by tracking number with high weight', () => {
    const docs = [
      docFixture({ id: 'A', trackingNumber: 'SDMS-2026-0001', title: 'Foo' }),
      docFixture({ id: 'B', title: 'Foo SDMS' }),
    ]
    const hits = scoreDocuments(docs, '0001')
    expect(hits[0].id).toBe('document:A')
  })

  it('returns empty for empty query', () => {
    expect(scoreDocuments([docFixture({})], '')).toEqual([])
  })

  it('case-insensitive', () => {
    const docs = [docFixture({ title: 'Procurement' })]
    expect(scoreDocuments(docs, 'PROCUREMENT')).toHaveLength(1)
  })
})

const reqFixture = (p: Partial<RequestWithItems>): RequestWithItems => ({
  id: 'REQ-X',
  requesterId: 'U001',
  departmentId: 'D001',
  status: 'pending',
  createdAt: '2026-04-01T00:00:00Z',
  items: [],
  totalAmount: 0,
  ...p,
})

describe('scoreProcurementRequests', () => {
  it('matches by request id and notes', () => {
    const requests = [
      reqFixture({ id: 'REQ-2026-0001', notes: 'Office supplies' }),
      reqFixture({ id: 'REQ-2026-0002', notes: 'Forklift parts' }),
    ]
    const hits = scoreProcurementRequests(requests, 'office')
    expect(hits.map((h) => h.id)).toEqual(['request:REQ-2026-0001'])
  })

  it('AND across notes and id substrings', () => {
    const requests = [
      reqFixture({ id: 'REQ-2026-0001', notes: 'Office supplies' }),
      reqFixture({ id: 'REQ-2026-0002', notes: 'Office chairs' }),
    ]
    const hits = scoreProcurementRequests(requests, 'office 0001')
    expect(hits.map((h) => h.id)).toEqual(['request:REQ-2026-0001'])
  })
})

const woFixture = (p: Partial<WorkOrder>): WorkOrder => ({
  id: 'WO-X',
  assetId: 'AST-001',
  title: 'Inspect',
  priority: 'medium',
  assignedTo: 'U999',
  status: 'pending',
  scheduledDate: '2026-05-01',
  createdAt: '2026-04-01T00:00:00Z',
  createdBy: 'U001',
  ...p,
})

describe('scoreWorkOrders', () => {
  it('ranks by id then title', () => {
    const orders = [
      woFixture({ id: 'WO-100', title: 'Replace fuel filter' }),
      woFixture({ id: 'WO-101', title: 'Tire rotation' }),
    ]
    const hits = scoreWorkOrders(orders, 'fuel')
    expect(hits[0].id).toBe('wo:WO-100')
  })
})

const itemFixture = (p: Partial<InventoryItem>): InventoryItem => ({
  id: 'INV-X',
  sku: 'SKU-X',
  name: 'Item',
  categoryId: 'C1',
  uomId: 'U1',
  warehouseId: 'W1',
  quantity: 100,
  reorderLevel: 10,
  createdAt: '2026-01-01',
  ...p,
})

describe('scoreInventoryItems', () => {
  it('matches by SKU and name', () => {
    const items = [
      itemFixture({ id: 'A', sku: 'BOLT-12', name: 'M12 Bolt' }),
      itemFixture({ id: 'B', sku: 'NUT-12', name: 'M12 Nut' }),
    ]
    const hits = scoreInventoryItems(items, 'bolt')
    expect(hits.map((h) => h.id)).toEqual(['inv:A'])
  })

  it('flags low stock in meta', () => {
    const items = [itemFixture({ id: 'A', sku: 'X', name: 'X', quantity: 5, reorderLevel: 10 })]
    const hits = scoreInventoryItems(items, 'X')
    expect(hits[0].meta).toContain('low stock')
  })
})

const assetFixture = (p: Partial<Asset>): Asset => ({
  id: 'AST-X',
  assetCode: 'AST-X',
  name: 'Asset',
  serialNumber: 'SN-001',
  categoryId: 'C1',
  locationId: 'L1',
  status: 'active',
  condition: 'good',
  purchaseDate: '2026-01-01',
  createdAt: '2026-01-01',
  ...p,
})

describe('scoreAssets', () => {
  it('matches by serial number with high weight', () => {
    const assets = [
      assetFixture({ id: 'A', serialNumber: 'TOY-FL-2024-011', name: 'Forklift' }),
      assetFixture({ id: 'B', serialNumber: 'CAT-EXC-2023-002', name: 'Excavator' }),
    ]
    const hits = scoreAssets(assets, 'TOY-FL')
    expect(hits[0].id).toBe('asset:A')
  })
})
