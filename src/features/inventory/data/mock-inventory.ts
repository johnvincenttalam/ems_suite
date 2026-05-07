import type { CycleCountSession, InventoryItem, StockMovement } from '@/features/inventory/types'

export const mockInventoryItems: InventoryItem[] = [
  { id: 'INV-1001', sku: 'OS-PAPR-A4',  name: 'A4 Copy Paper, 80gsm',         description: 'Ream of 500 sheets', categoryId: 'C005', uomId: 'U002', warehouseId: 'W001', quantity: 240, reorderLevel: 100, unitCost: 4.20,  createdAt: '2024-09-01' },
  { id: 'INV-1002', sku: 'OS-PEN-BLU',  name: 'Ballpoint Pen, Blue',          description: 'Box of 12',          categoryId: 'C005', uomId: 'U002', warehouseId: 'W001', quantity: 56,  reorderLevel: 60,  unitCost: 3.10,  createdAt: '2024-09-04' },
  { id: 'INV-1003', sku: 'OS-TONER-BK', name: 'Laser Toner Cartridge (Black)', description: 'For HP M404',       categoryId: 'C005', uomId: 'U001', warehouseId: 'W001', quantity: 12,  reorderLevel: 8,   unitCost: 65.00, createdAt: '2024-09-12' },
  { id: 'INV-1004', sku: 'CS-DET-5L',   name: 'Detergent, Industrial',        description: '5L bottle',          categoryId: 'C006', uomId: 'U006', warehouseId: 'W001', quantity: 38,  reorderLevel: 20,  unitCost: 12.50, createdAt: '2024-09-20' },
  { id: 'INV-1005', sku: 'CS-GLOV-NIT', name: 'Nitrile Gloves, Disposable',   description: 'Box of 100',         categoryId: 'C006', uomId: 'U002', warehouseId: 'W002', quantity: 4,   reorderLevel: 25,  unitCost: 8.40,  createdAt: '2024-10-02' },
  { id: 'INV-1006', sku: 'SP-BLT-M10',  name: 'Bolt M10 x 50mm',              description: 'Pack of 50',         categoryId: 'C007', uomId: 'U003', warehouseId: 'W002', quantity: 124, reorderLevel: 50,  unitCost: 6.75,  createdAt: '2024-10-15' },
  { id: 'INV-1007', sku: 'SP-OIL-MOT',  name: 'Motor Oil 10W-40',             description: '4L bottle',          categoryId: 'C007', uomId: 'U006', warehouseId: 'W002', quantity: 72,  reorderLevel: 40,  unitCost: 22.00, createdAt: '2024-10-22' },
  { id: 'INV-1008', sku: 'SP-FLT-AIR',  name: 'Air Filter, Generator',        description: 'Spec for 30kVA gen', categoryId: 'C007', uomId: 'U001', warehouseId: 'W002', quantity: 18,  reorderLevel: 10,  unitCost: 35.00, createdAt: '2024-11-04' },
  { id: 'INV-1009', sku: 'SG-HELM-WH',  name: 'Safety Helmet, White',         description: 'EN 397 certified',   categoryId: 'C008', uomId: 'U001', warehouseId: 'W001', quantity: 64,  reorderLevel: 30,  unitCost: 18.00, createdAt: '2024-11-20' },
  { id: 'INV-1010', sku: 'SG-VEST-XL',  name: 'High-Vis Vest, XL',            description: 'Reflective, orange', categoryId: 'C008', uomId: 'U001', warehouseId: 'W001', quantity: 27,  reorderLevel: 30,  unitCost: 9.50,  createdAt: '2024-12-08' },
  { id: 'INV-1011', sku: 'SG-MASK-N95', name: 'N95 Respirator Mask',          description: 'Box of 20',          categoryId: 'C008', uomId: 'U002', warehouseId: 'W006', quantity: 9,   reorderLevel: 15,  unitCost: 28.00, createdAt: '2025-01-04' },
  { id: 'INV-1012', sku: 'SP-LBR-MUL',  name: 'Multi-Purpose Lubricant',      description: '500mL spray',        categoryId: 'C007', uomId: 'U007', warehouseId: 'W002', quantity: 45,  reorderLevel: 25,  unitCost: 7.20,  createdAt: '2025-02-11' },
]

export const mockStockMovements: StockMovement[] = [
  { id: 'MV-2001', itemId: 'INV-1001', type: 'in',         quantity: 100, destinationLocationId: 'W001',                              reason: 'PO-2025-0019 received',          createdAt: '2026-04-26T09:12:00Z', createdBy: 'Admin User', status: 'applied', referenceNumber: 'RCPT-00045' },
  { id: 'MV-2002', itemId: 'INV-1002', type: 'out',        quantity: 12,  sourceLocationId: 'W001',                                    reason: 'Issued to Operations dept.',     createdAt: '2026-04-26T11:30:00Z', createdBy: 'Jane Doe',   status: 'applied', referenceNumber: 'ISSUE-00188' },
  { id: 'MV-2003', itemId: 'INV-1006', type: 'transfer',   quantity: 50,  sourceLocationId: 'W001', destinationLocationId: 'W002',     reason: 'Restocking north DC',            createdAt: '2026-04-26T14:08:00Z', createdBy: 'Jane Doe',   status: 'applied', approverId: 'Admin User', approvedBy: 'Admin User', approvedAt: '2026-04-26T15:02:00Z' },
  { id: 'MV-2004', itemId: 'INV-1005', type: 'in',         quantity: 30,  destinationLocationId: 'W002',                              reason: 'PO-2025-0020 received',          createdAt: '2026-04-27T08:01:00Z', createdBy: 'Admin User', status: 'applied', referenceNumber: 'RCPT-00046' },
  { id: 'MV-2005', itemId: 'INV-1009', type: 'out',        quantity: 6,   sourceLocationId: 'W001',                                    reason: 'Site team Alpha — daily issue', createdAt: '2026-04-27T08:42:00Z', createdBy: 'John Smith', status: 'applied', referenceNumber: 'ISSUE-00189' },
  { id: 'MV-2006', itemId: 'INV-1003', type: 'adjustment', quantity: -1,  sourceLocationId: 'W001',                                    reason: 'Cycle count — damaged unit',    createdAt: '2026-04-27T10:15:00Z', createdBy: 'Jane Doe',   status: 'applied', approverId: 'Admin User', approvedBy: 'Admin User', approvedAt: '2026-04-27T10:30:00Z' },
  { id: 'MV-2007', itemId: 'INV-1011', type: 'transfer',   quantity: 4,   sourceLocationId: 'W006', destinationLocationId: 'W001',     reason: 'Move to main stock',             createdAt: '2026-04-27T11:48:00Z', createdBy: 'Admin User', status: 'applied', approverId: 'Admin User', approvedBy: 'Admin User', approvedAt: '2026-04-27T12:00:00Z' },
  { id: 'MV-2008', itemId: 'INV-1004', type: 'out',        quantity: 6,   sourceLocationId: 'W001',                                    reason: 'Cleaning crew — weekly',         createdAt: '2026-04-27T13:00:00Z', createdBy: 'John Smith', status: 'applied', referenceNumber: 'ISSUE-00190' },
  { id: 'MV-2009', itemId: 'INV-1007', type: 'in',         quantity: 24,  destinationLocationId: 'W002',                              reason: 'PO-2025-0021 received',          createdAt: '2026-04-27T14:25:00Z', createdBy: 'Admin User', status: 'applied', referenceNumber: 'RCPT-00047' },

  // Pending records waiting on an approver — exercise the approval flow.
  { id: 'MV-2010', itemId: 'INV-1010', type: 'transfer',   quantity: 12,  sourceLocationId: 'W001', destinationLocationId: 'W002',     reason: 'Site team request — vests',      createdAt: '2026-05-06T08:30:00Z', createdBy: 'John Smith', status: 'pending', approverId: 'Jane Doe' },
  { id: 'MV-2011', itemId: 'INV-1008', type: 'adjustment', quantity: -2,  sourceLocationId: 'W002',                                    reason: 'Filter found defective during PM', createdAt: '2026-05-06T09:15:00Z', createdBy: 'John Smith', status: 'pending', approverId: 'Jane Doe' },
  { id: 'MV-2012', itemId: 'INV-1012', type: 'transfer',   quantity: 5,   sourceLocationId: 'W002', destinationLocationId: 'W001',     reason: 'Restock for Site Alpha',         createdAt: '2026-05-06T10:00:00Z', createdBy: 'John Smith', status: 'pending', approverId: 'Admin User' },
]

export const mockCycleCountSessions: CycleCountSession[] = [
  // Completed last week — full count of W001 office supplies.
  {
    id: 'CC-0001',
    warehouseId: 'W001',
    categoryId: 'C005',
    scheduledDate: '2026-04-28',
    startedAt: '2026-04-28T08:00:00Z',
    completedAt: '2026-04-28T11:30:00Z',
    status: 'completed',
    createdBy: 'Jane Doe',
    finalizedBy: 'Jane Doe',
    lines: [
      { itemId: 'INV-1001', expectedQty: 240, actualQty: 240, countedAt: '2026-04-28T08:30:00Z', countedBy: 'John Smith' },
      { itemId: 'INV-1002', expectedQty: 56, actualQty: 54, countedAt: '2026-04-28T08:45:00Z', countedBy: 'John Smith' },
      { itemId: 'INV-1003', expectedQty: 12, actualQty: 12, countedAt: '2026-04-28T09:10:00Z', countedBy: 'John Smith' },
    ],
  },
  // In-progress — counter has done 2 of 4 lines.
  {
    id: 'CC-0002',
    warehouseId: 'W002',
    categoryId: 'C007',
    scheduledDate: '2026-05-06',
    startedAt: '2026-05-06T08:15:00Z',
    status: 'in_progress',
    createdBy: 'Jane Doe',
    lines: [
      { itemId: 'INV-1006', expectedQty: 124, actualQty: 124, countedAt: '2026-05-06T08:40:00Z', countedBy: 'John Smith' },
      { itemId: 'INV-1007', expectedQty: 72, actualQty: 70, countedAt: '2026-05-06T09:05:00Z', countedBy: 'John Smith' },
      { itemId: 'INV-1008', expectedQty: 18 },
      { itemId: 'INV-1012', expectedQty: 45 },
    ],
  },
  // Scheduled for next week — not yet started.
  {
    id: 'CC-0003',
    warehouseId: 'W001',
    categoryId: 'C008',
    scheduledDate: '2026-05-13',
    status: 'scheduled',
    createdBy: 'Jane Doe',
    lines: [
      { itemId: 'INV-1009', expectedQty: 64 },
      { itemId: 'INV-1010', expectedQty: 27 },
    ],
  },
]
