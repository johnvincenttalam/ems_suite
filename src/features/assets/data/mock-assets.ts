import type { Asset, AssetAssignment } from '@/features/assets/types'

export const mockAssets: Asset[] = [
  { id: 'AST-001', name: 'MacBook Pro 16"',         serialNumber: 'MBP16-A2YH-001', categoryId: 'C001', locationId: 'W003', status: 'active',      assignedTo: 'U001', purchaseDate: '2024-08-12', purchaseCost: 3299, createdAt: '2024-08-12' },
  { id: 'AST-002', name: 'MacBook Pro 14"',         serialNumber: 'MBP14-A2YH-002', categoryId: 'C001', locationId: 'W003', status: 'active',      assignedTo: 'U002', purchaseDate: '2024-08-12', purchaseCost: 2199, createdAt: '2024-08-12' },
  { id: 'AST-003', name: 'Dell UltraSharp 27"',     serialNumber: 'DELL-U2723-003', categoryId: 'C001', locationId: 'W003', status: 'active',      assignedTo: 'U002', purchaseDate: '2024-08-22', purchaseCost: 649,  createdAt: '2024-08-22' },
  { id: 'AST-004', name: 'Logitech MX Master 3',    serialNumber: 'LOG-MX3-AT-004', categoryId: 'C001', locationId: 'W003', status: 'active',                          purchaseDate: '2024-09-01', purchaseCost: 99,   createdAt: '2024-09-01' },
  { id: 'AST-005', name: 'Herman Miller Aeron',     serialNumber: 'HM-AER-2024-005', categoryId: 'C002', locationId: 'W003', status: 'active',      assignedTo: 'U001', purchaseDate: '2024-08-12', purchaseCost: 1495, createdAt: '2024-08-12' },
  { id: 'AST-006', name: 'Steelcase Series 1',      serialNumber: 'SC-S1-2024-006', categoryId: 'C002', locationId: 'W003', status: 'active',                          purchaseDate: '2024-08-12', purchaseCost: 415,  createdAt: '2024-08-12' },
  { id: 'AST-007', name: 'IKEA Bekant Desk',        serialNumber: 'IK-BK-2024-007', categoryId: 'C002', locationId: 'W005', status: 'active',                          purchaseDate: '2024-09-15', purchaseCost: 199,  createdAt: '2024-09-15' },
  { id: 'AST-008', name: 'Toyota Hilux Pickup',     serialNumber: 'JTM-HLX-2025-008', categoryId: 'C003', locationId: 'W002', status: 'active',     assignedTo: 'U003', purchaseDate: '2025-01-10', purchaseCost: 38500, checklistId: 'TPL-002', createdAt: '2025-01-10' },
  { id: 'AST-009', name: 'Ford Transit Van',        serialNumber: 'FORD-TR-2024-009', categoryId: 'C003', locationId: 'W001', status: 'maintenance',                  purchaseDate: '2024-06-04', purchaseCost: 41200, checklistId: 'TPL-002', createdAt: '2024-06-04' },
  { id: 'AST-010', name: 'Caterpillar 30kVA Genset', serialNumber: 'CAT-30K-2024-010', categoryId: 'C004', locationId: 'W004', status: 'active',                       purchaseDate: '2024-11-12', purchaseCost: 18500, checklistId: 'TPL-004', createdAt: '2024-11-12' },
  { id: 'AST-011', name: 'Toyota 2.5T Forklift',    serialNumber: 'TOY-FL-2024-011', categoryId: 'C004', locationId: 'W001', status: 'maintenance',                   purchaseDate: '2024-07-19', purchaseCost: 26900, checklistId: 'TPL-001', createdAt: '2024-07-19' },
  { id: 'AST-012', name: 'Dell Precision Workstation', serialNumber: 'DELL-WS-2023-012', categoryId: 'C001', locationId: 'W001', status: 'disposed',                  purchaseDate: '2021-03-04', purchaseCost: 2899, createdAt: '2021-03-04' },
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
