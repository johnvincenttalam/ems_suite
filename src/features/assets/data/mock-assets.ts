import type { Asset, AssetAssignment, AssetEvent, Inspection } from '@/features/assets/types'

export const mockAssets: Asset[] = [
  { id: 'AST-001', assetCode: 'LAP-0001', name: 'MacBook Pro 16"',         model: 'A2YH 2024', vendor: 'Apple Inc.',           serialNumber: 'MBP16-A2YH-001', categoryId: 'C001', locationId: 'W003', status: 'active',      condition: 'excellent', assignedTo: 'U001', purchaseDate: '2024-08-12', purchaseCost: 3299, warrantyExpiry: '2027-08-12', usefulLifeMonths: 60, salvageValue: 300,  description: '16-inch M3 Pro, 36GB RAM / 1TB SSD',                          createdAt: '2024-08-12' },
  { id: 'AST-002', assetCode: 'LAP-0002', name: 'MacBook Pro 14"',         model: 'A2YH 2024', vendor: 'Apple Inc.',           serialNumber: 'MBP14-A2YH-002', categoryId: 'C001', locationId: 'W003', status: 'active',      condition: 'good',      assignedTo: 'U002', purchaseDate: '2024-08-12', purchaseCost: 2199, warrantyExpiry: '2027-08-12', usefulLifeMonths: 60, salvageValue: 200,  description: '14-inch M3, 18GB RAM / 512GB SSD',                            createdAt: '2024-08-12' },
  { id: 'AST-003', assetCode: 'MON-0001', name: 'Dell UltraSharp 27"',     model: 'U2723QE',   vendor: 'Dell Technologies',    serialNumber: 'DELL-U2723-003', categoryId: 'C001', locationId: 'W003', status: 'active',      condition: 'good',      assignedTo: 'U002', purchaseDate: '2024-08-22', purchaseCost: 649,  warrantyExpiry: '2027-08-22', usefulLifeMonths: 60, salvageValue: 50,                                                                                              createdAt: '2024-08-22' },
  { id: 'AST-004', assetCode: 'PER-0001', name: 'Logitech MX Master 3',    model: 'MX Master 3', vendor: 'Logitech',           serialNumber: 'LOG-MX3-AT-004', categoryId: 'C001', locationId: 'W003', status: 'active',      condition: 'fair',                          purchaseDate: '2024-09-01', purchaseCost: 99,   warrantyExpiry: '2026-09-01', usefulLifeMonths: 36,                                                                                                  createdAt: '2024-09-01' },
  { id: 'AST-005', assetCode: 'CHR-0001', name: 'Herman Miller Aeron',     model: 'Size B',    vendor: 'Herman Miller',        serialNumber: 'HM-AER-2024-005', categoryId: 'C002', locationId: 'W003', status: 'active',      condition: 'excellent', assignedTo: 'U001', purchaseDate: '2024-08-12', purchaseCost: 1495, warrantyExpiry: '2036-08-12', usefulLifeMonths: 144, salvageValue: 200, description: 'Graphite frame, polished aluminum base',                       createdAt: '2024-08-12' },
  { id: 'AST-006', assetCode: 'CHR-0002', name: 'Steelcase Series 1',      model: 'Series 1',  vendor: 'Steelcase',            serialNumber: 'SC-S1-2024-006', categoryId: 'C002', locationId: 'W003', status: 'active',      condition: 'good',                          purchaseDate: '2024-08-12', purchaseCost: 415,  warrantyExpiry: '2036-08-12', usefulLifeMonths: 120, salvageValue: 50,                                                                                              createdAt: '2024-08-12' },
  { id: 'AST-007', assetCode: 'DSK-0001', name: 'IKEA Bekant Desk',        model: 'Bekant',    vendor: 'IKEA',                 serialNumber: 'IK-BK-2024-007', categoryId: 'C002', locationId: 'W005', status: 'active',      condition: 'good',                          purchaseDate: '2024-09-15', purchaseCost: 199,                                 usefulLifeMonths: 96,                                                                                                  createdAt: '2024-09-15' },
  { id: 'AST-008', assetCode: 'VEH-0001', name: 'Toyota Hilux Pickup',     model: 'Hilux 2.8 GR-S', vendor: 'Toyota Philippines', serialNumber: 'JTM-HLX-2025-008', categoryId: 'C003', locationId: 'W002', status: 'active',     condition: 'good',      assignedTo: 'U003', purchaseDate: '2025-01-10', purchaseCost: 38500, warrantyExpiry: '2030-01-10', usefulLifeMonths: 96, salvageValue: 8000, checklistId: 'TPL-002', description: 'Field operations vehicle — assigned to Site Alpha',           createdAt: '2025-01-10' },
  { id: 'AST-009', assetCode: 'VEH-0002', name: 'Ford Transit Van',        model: 'Transit Custom 320', vendor: 'Ford',         serialNumber: 'FORD-TR-2024-009', categoryId: 'C003', locationId: 'W001', status: 'maintenance', condition: 'fair',                          purchaseDate: '2024-06-04', purchaseCost: 41200, warrantyExpiry: '2029-06-04', usefulLifeMonths: 96, salvageValue: 9000, checklistId: 'TPL-002', description: 'Out for transmission service',                                  createdAt: '2024-06-04' },
  { id: 'AST-010', assetCode: 'GEN-0010', name: 'Caterpillar 30kVA Genset', model: 'C3.3-DE33', vendor: 'Caterpillar',         serialNumber: 'CAT-30K-2024-010', categoryId: 'C004', locationId: 'W004', status: 'active',      condition: 'good',                          purchaseDate: '2024-11-12', purchaseCost: 18500, warrantyExpiry: '2027-11-12', usefulLifeMonths: 120, salvageValue: 3500, checklistId: 'TPL-004', description: 'Backup generator for site C',                                   meterUnit: 'hours', currentMeter: 1480, meterUpdatedAt: '2026-05-08T09:00:00Z', meterUpdatedBy: 'Sam Tech', createdAt: '2024-11-12' },
  { id: 'AST-011', assetCode: 'EQP-0001', name: 'Toyota 2.5T Forklift',    model: '8FBE25U',   vendor: 'Toyota Material Handling', serialNumber: 'TOY-FL-2024-011', categoryId: 'C004', locationId: 'W001', status: 'maintenance', condition: 'poor',                          purchaseDate: '2024-07-19', purchaseCost: 26900, warrantyExpiry: '2027-07-19', usefulLifeMonths: 96, salvageValue: 4000, checklistId: 'TPL-001', description: 'Hydraulic leak — under inspection',                             meterUnit: 'hours', currentMeter: 3275, meterUpdatedAt: '2026-05-10T15:30:00Z', meterUpdatedBy: 'Jane Doe', createdAt: '2024-07-19' },
  { id: 'AST-012', assetCode: 'WS-0001',  name: 'Dell Precision Workstation', model: '7820',    vendor: 'Dell Technologies',    serialNumber: 'DELL-WS-2023-012', categoryId: 'C001', locationId: 'W001', status: 'disposed',    condition: 'out_of_service',                purchaseDate: '2021-03-04', purchaseCost: 2899,                                  usefulLifeMonths: 60, salvageValue: 100, description: 'End of life — replaced 2024-12',
    disposal: { type: 'scrapped', amount: 50, disposedTo: 'EcoMetals Recycling', disposedDate: '2024-12-04', disposedBy: 'Jane Doe', reason: 'Beyond economic repair', pendingApproverName: 'Admin User', approvedBy: 'Admin User', approvedAt: '2024-12-03T14:00:00Z' },
    createdAt: '2021-03-04' },
]

export const mockAssetAssignments: AssetAssignment[] = [
  { id: 'ASN-001', assetId: 'AST-001', assignedTo: 'U001', assignedDate: '2024-08-13', notes: 'Onboarding kit — admin laptop' },
  { id: 'ASN-002', assetId: 'AST-002', assignedTo: 'U002', assignedDate: '2024-08-13' },
  { id: 'ASN-003', assetId: 'AST-003', assignedTo: 'U002', assignedDate: '2024-08-23', notes: 'Secondary monitor' },
  { id: 'ASN-004', assetId: 'AST-005', assignedTo: 'U001', assignedDate: '2024-08-14' },
  { id: 'ASN-005', assetId: 'AST-008', assignedTo: 'U003', assignedDate: '2025-01-15', notes: 'Field operations' },
  { id: 'ASN-006', assetId: 'AST-012', assignedTo: 'U003', assignedDate: '2021-03-08', returnedDate: '2024-12-01', notes: 'Returned for disposal — end of life' },
  { id: 'ASN-007', assetId: 'AST-009', assignedTo: 'U002', assignedDate: '2024-06-10', returnedDate: '2026-04-12', notes: 'Returned for service' },
  { id: 'ASN-008', assetId: 'AST-001', assignedTo: 'U003', assignedDate: '2024-08-12', returnedDate: '2024-08-13', notes: 'Initial assignment, reassigned same day' },
]

/**
 * Lifecycle events — backfilled from existing assignments + a few synthetic
 * inspection / maintenance / disposal events so the History tab + dashboard
 * widgets have something interesting to show on first paint.
 */
export const mockAssetEvents: AssetEvent[] = [
  // AST-001: created → first assigned to U003 → returned → reassigned U001
  { id: 'EVT-0001', assetId: 'AST-001', type: 'created',     detail: 'Registered MacBook Pro 16" (LAP-0001)', timestamp: '2024-08-12T09:00:00Z', actorName: 'Admin User' },
  { id: 'EVT-0002', assetId: 'AST-001', type: 'assigned',    detail: 'Assigned to John Smith — initial allocation', timestamp: '2024-08-12T14:30:00Z', actorName: 'Admin User', payload: { toUserId: 'U003' } },
  { id: 'EVT-0003', assetId: 'AST-001', type: 'returned',    detail: 'Returned by John Smith — reassignment',         timestamp: '2024-08-13T08:15:00Z', actorName: 'John Smith',  payload: { fromUserId: 'U003' } },
  { id: 'EVT-0004', assetId: 'AST-001', type: 'assigned',    detail: 'Assigned to Admin User',                         timestamp: '2024-08-13T08:30:00Z', actorName: 'Admin User', payload: { toUserId: 'U001' } },

  // AST-002, 003, 005: simple created → assigned chain
  { id: 'EVT-0005', assetId: 'AST-002', type: 'created',  detail: 'Registered MacBook Pro 14" (LAP-0002)',     timestamp: '2024-08-12T09:05:00Z', actorName: 'Admin User' },
  { id: 'EVT-0006', assetId: 'AST-002', type: 'assigned', detail: 'Assigned to Jane Doe',                       timestamp: '2024-08-13T10:00:00Z', actorName: 'Admin User', payload: { toUserId: 'U002' } },
  { id: 'EVT-0007', assetId: 'AST-003', type: 'created',  detail: 'Registered Dell UltraSharp 27"',             timestamp: '2024-08-22T11:00:00Z', actorName: 'Admin User' },
  { id: 'EVT-0008', assetId: 'AST-003', type: 'assigned', detail: 'Assigned to Jane Doe — secondary monitor',   timestamp: '2024-08-23T09:30:00Z', actorName: 'Admin User', payload: { toUserId: 'U002' } },
  { id: 'EVT-0009', assetId: 'AST-005', type: 'created',  detail: 'Registered Herman Miller Aeron',             timestamp: '2024-08-12T09:15:00Z', actorName: 'Admin User' },
  { id: 'EVT-0010', assetId: 'AST-005', type: 'assigned', detail: 'Assigned to Admin User',                     timestamp: '2024-08-14T13:00:00Z', actorName: 'Admin User', payload: { toUserId: 'U001' } },

  // AST-008: created → assigned with field ops note → recent inspection
  { id: 'EVT-0011', assetId: 'AST-008', type: 'created',     detail: 'Registered Toyota Hilux (VEH-0001)',                           timestamp: '2025-01-10T08:00:00Z', actorName: 'Admin User' },
  { id: 'EVT-0012', assetId: 'AST-008', type: 'assigned',    detail: 'Assigned to John Smith — Field Ops',                          timestamp: '2025-01-15T09:00:00Z', actorName: 'Jane Doe',   payload: { toUserId: 'U003' } },
  { id: 'EVT-0013', assetId: 'AST-008', type: 'inspection',  detail: 'Quarterly inspection — passed (8/9 items)',                   timestamp: '2026-04-15T11:00:00Z', actorName: 'John Smith',  payload: { inspectionId: 'INSP-0002' } },

  // AST-009: created → assigned → returned → maintenance
  { id: 'EVT-0014', assetId: 'AST-009', type: 'created',           detail: 'Registered Ford Transit Van',                  timestamp: '2024-06-04T10:00:00Z', actorName: 'Admin User' },
  { id: 'EVT-0015', assetId: 'AST-009', type: 'assigned',          detail: 'Assigned to Jane Doe',                          timestamp: '2024-06-10T09:00:00Z', actorName: 'Admin User', payload: { toUserId: 'U002' } },
  { id: 'EVT-0016', assetId: 'AST-009', type: 'returned',          detail: 'Returned by Jane Doe — service due',             timestamp: '2026-04-12T15:30:00Z', actorName: 'Jane Doe',   payload: { fromUserId: 'U002' } },
  { id: 'EVT-0017', assetId: 'AST-009', type: 'maintenance_started', detail: 'Out for transmission service',                timestamp: '2026-04-13T08:00:00Z', actorName: 'Jane Doe' },
  { id: 'EVT-0018', assetId: 'AST-009', type: 'condition_changed', detail: 'Condition demoted: good → fair',                 timestamp: '2026-04-13T08:05:00Z', actorName: 'Jane Doe',   payload: { fromCondition: 'good', toCondition: 'fair' } },

  // AST-011: created → assigned-internally for hydraulic issue, recent inspection failed
  { id: 'EVT-0019', assetId: 'AST-011', type: 'created',           detail: 'Registered Toyota Forklift',                                 timestamp: '2024-07-19T08:00:00Z', actorName: 'Admin User' },
  { id: 'EVT-0020', assetId: 'AST-011', type: 'inspection',        detail: 'Inspection failed — hydraulic leak (3 items failed)',         timestamp: '2026-04-28T10:00:00Z', actorName: 'John Smith',  payload: { inspectionId: 'INSP-0001' } },
  { id: 'EVT-0021', assetId: 'AST-011', type: 'maintenance_started', detail: 'Pulled for hydraulic repair',                              timestamp: '2026-04-28T13:00:00Z', actorName: 'Jane Doe' },
  { id: 'EVT-0022', assetId: 'AST-011', type: 'condition_changed', detail: 'Condition demoted: fair → poor',                              timestamp: '2026-04-28T13:05:00Z', actorName: 'Jane Doe',   payload: { fromCondition: 'fair', toCondition: 'poor' } },

  // AST-012: full lifecycle through to disposal
  { id: 'EVT-0023', assetId: 'AST-012', type: 'created',            detail: 'Registered Dell Precision Workstation',                     timestamp: '2021-03-04T09:00:00Z', actorName: 'Admin User' },
  { id: 'EVT-0024', assetId: 'AST-012', type: 'assigned',           detail: 'Assigned to John Smith',                                     timestamp: '2021-03-08T10:00:00Z', actorName: 'Admin User', payload: { toUserId: 'U003' } },
  { id: 'EVT-0025', assetId: 'AST-012', type: 'returned',           detail: 'Returned for disposal — end of life',                        timestamp: '2024-12-01T14:00:00Z', actorName: 'John Smith', payload: { fromUserId: 'U003' } },
  { id: 'EVT-0026', assetId: 'AST-012', type: 'disposal_submitted', detail: 'Disposal submitted: Scrapped (PHP 50, EcoMetals Recycling)', timestamp: '2024-12-02T11:00:00Z', actorName: 'Jane Doe',   payload: { disposalType: 'scrapped', disposalAmount: 50 } },
  { id: 'EVT-0027', assetId: 'AST-012', type: 'disposal_approved',  detail: 'Disposal approved — Beyond economic repair',                 timestamp: '2024-12-03T14:00:00Z', actorName: 'Admin User', payload: { disposalType: 'scrapped' } },
]

export const mockInspections: Inspection[] = [
  // AST-011 forklift — failed inspection that triggered the maintenance pull.
  {
    id: 'INSP-0001',
    assetId: 'AST-011',
    checklistId: 'TPL-001',
    inspectionDate: '2026-04-28',
    inspector: 'John Smith',
    status: 'submitted',
    overallResult: 'fail',
    notes: 'Hydraulic leak from main lift cylinder; fluid pooling under unit. Tagged out and routed to maintenance.',
    createdAt: '2026-04-28T09:30:00Z',
    submittedAt: '2026-04-28T10:00:00Z',
    lines: [
      { label: 'Hydraulic System',        result: 'fail', remarks: 'Visible leak from main lift cylinder' },
      { label: 'Engine Condition',        result: 'pass' },
      { label: 'Tracks / Undercarriage',  result: 'pass' },
      { label: 'Safety Devices',          result: 'fail', remarks: 'Seat belt retractor sluggish' },
      { label: 'Lights / Alarms',         result: 'pass' },
      { label: 'Tires',                   result: 'pass' },
      { label: 'Operator Cabin',          result: 'fail', remarks: 'Cracked side mirror' },
      { label: 'Fluid Levels',            result: 'pass' },
      { label: 'Documentation',           result: 'pass' },
    ],
  },
  // AST-008 hilux — passing inspection, one minor remark.
  {
    id: 'INSP-0002',
    assetId: 'AST-008',
    checklistId: 'TPL-002',
    inspectionDate: '2026-04-15',
    inspector: 'John Smith',
    status: 'submitted',
    overallResult: 'pass',
    notes: 'Routine quarterly check. Small chip on windshield noted but not yet a safety concern.',
    createdAt: '2026-04-15T10:30:00Z',
    submittedAt: '2026-04-15T11:00:00Z',
    lines: [
      { label: 'Engine Condition', result: 'pass' },
      { label: 'Brakes',           result: 'pass' },
      { label: 'Tires',            result: 'pass' },
      { label: 'Lights / Alarms',  result: 'pass' },
      { label: 'Fluid Levels',     result: 'pass' },
      { label: 'Body / Glass',     result: 'pass', remarks: 'Small windshield chip — monitor' },
      { label: 'Safety Devices',   result: 'pass' },
      { label: 'Documentation',    result: 'pass' },
      { label: 'Cleanliness',      result: 'pass' },
    ],
  },
]
