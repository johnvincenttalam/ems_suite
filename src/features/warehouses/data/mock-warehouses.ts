import type { Warehouse } from '@/features/warehouses/types'

export const mockWarehouses: Warehouse[] = [
  { id: 'W001', name: 'Main Warehouse', type: 'warehouse', address: '12 Industrial Rd, Singapore', contact: '+65 6000 1001', capacity: 5000, createdAt: '2024-08-12' },
  { id: 'W002', name: 'North Distribution Center', type: 'warehouse', address: '5 Logistics Park, Selangor', contact: '+60 3 8000 2002', capacity: 3500, createdAt: '2024-09-05' },
  { id: 'W003', name: 'HQ Office', type: 'office', address: '1 Marina Blvd, Singapore', contact: '+65 6000 1000', createdAt: '2024-08-12' },
  { id: 'W004', name: 'Project Site Alpha', type: 'site', address: 'KM 14 Highway, Cebu', contact: '+63 32 555 0140', createdAt: '2024-11-19' },
  { id: 'W005', name: 'Retail Branch A', type: 'office', address: '88 Orchard Rd, Singapore', contact: '+65 6700 8888', createdAt: '2025-01-03' },
  { id: 'W006', name: 'Cold Storage Facility', type: 'warehouse', address: '22 Cold Chain Ave, Penang', capacity: 1200, createdAt: '2025-02-12' },
]
