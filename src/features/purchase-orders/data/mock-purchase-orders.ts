import type { POItem, PurchaseOrder } from '@/features/purchase-orders/types'

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-2026-0001',
    supplierId: 'S001',
    requisitionId: 'REQ-2025-0312',
    status: 'completed',
    notes: 'Quarterly office supply replenishment',
    createdAt: '2026-04-23T11:20:00Z',
    createdBy: 'U001',
    sentAt: '2026-04-23T11:25:00Z',
    expectedDeliveryDate: '2026-04-30',
  },
  {
    id: 'PO-2026-0002',
    supplierId: 'S007',
    requisitionId: 'REQ-2025-0313',
    status: 'partially_received',
    notes: 'Forklift spares — urgent',
    createdAt: '2026-04-24T09:15:00Z',
    createdBy: 'U001',
    sentAt: '2026-04-24T09:20:00Z',
    expectedDeliveryDate: '2026-05-02',
  },
  {
    id: 'PO-2026-0003',
    supplierId: 'S004',
    requisitionId: 'REQ-2025-0315',
    status: 'ordered',
    notes: 'Vehicle maintenance kits',
    createdAt: '2026-04-25T10:30:00Z',
    createdBy: 'U001',
    sentAt: '2026-04-25T10:35:00Z',
    expectedDeliveryDate: '2026-05-10',
  },
]

export const mockPOItems: POItem[] = [
  { id: 'POI-001', poId: 'PO-2026-0001', itemId: 'INV-1001', quantity: 50, unitCost: 4.20, receivedQty: 50 },
  { id: 'POI-002', poId: 'PO-2026-0001', itemId: 'INV-1002', quantity: 30, unitCost: 3.10, receivedQty: 30 },
  { id: 'POI-003', poId: 'PO-2026-0001', itemId: 'INV-1003', quantity: 8,  unitCost: 65.00, receivedQty: 8  },

  { id: 'POI-004', poId: 'PO-2026-0002', itemId: 'INV-1006', quantity: 20, unitCost: 6.75, receivedQty: 20 },
  { id: 'POI-005', poId: 'PO-2026-0002', itemId: 'INV-1007', quantity: 12, unitCost: 22.00, receivedQty: 6  },

  { id: 'POI-006', poId: 'PO-2026-0003', itemId: 'INV-1007', quantity: 24, unitCost: 22.00, receivedQty: 0 },
  { id: 'POI-007', poId: 'PO-2026-0003', itemId: 'INV-1008', quantity: 4,  unitCost: 35.00, receivedQty: 0 },
  { id: 'POI-008', poId: 'PO-2026-0003', itemId: 'INV-1012', quantity: 18, unitCost: 7.20,  receivedQty: 0 },
]
