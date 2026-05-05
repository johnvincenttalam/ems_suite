import type { AuditEntry } from '@/features/audit-log/types'

export const mockAuditLog: AuditEntry[] = [
  { id: 'A001', userId: 'U001', userName: 'Admin User', action: 'login', module: 'Auth', detail: 'Signed in from 192.168.1.10', timestamp: '2026-04-27T08:14:21Z' },
  { id: 'A002', userId: 'U001', userName: 'Admin User', action: 'create', module: 'Departments', detail: 'Created department "Logistics"', timestamp: '2026-04-27T08:18:02Z' },
  { id: 'A003', userId: 'U002', userName: 'Jane Doe', action: 'update', module: 'Inventory', detail: 'Adjusted stock for SKU INV-1042', timestamp: '2026-04-27T08:32:11Z' },
  { id: 'A004', userId: 'U002', userName: 'Jane Doe', action: 'approve', module: 'Procurement', detail: 'Approved request REQ-2025-0312', timestamp: '2026-04-27T09:05:48Z' },
  { id: 'A005', userId: 'U003', userName: 'John Smith', action: 'reject', module: 'Procurement', detail: 'Rejected request REQ-2025-0314 (insufficient budget)', timestamp: '2026-04-27T09:11:33Z' },
  { id: 'A006', userId: 'U001', userName: 'Admin User', action: 'create', module: 'Suppliers', detail: 'Created supplier "Apex Hardware"', timestamp: '2026-04-27T10:00:18Z' },
  { id: 'A007', userId: 'U001', userName: 'Admin User', action: 'update', module: 'Roles', detail: 'Updated permissions for role "Editor"', timestamp: '2026-04-27T10:21:55Z' },
  { id: 'A008', userId: 'U002', userName: 'Jane Doe', action: 'delete', module: 'Inventory', detail: 'Deleted item SKU INV-0098', timestamp: '2026-04-27T11:04:09Z' },
  { id: 'A009', userId: 'U003', userName: 'John Smith', action: 'logout', module: 'Auth', detail: 'Signed out', timestamp: '2026-04-27T11:30:00Z' },
  { id: 'A010', userId: 'U002', userName: 'Jane Doe', action: 'create', module: 'Maintenance', detail: 'Created work order WO-2025-0099', timestamp: '2026-04-27T12:14:42Z' },
]
