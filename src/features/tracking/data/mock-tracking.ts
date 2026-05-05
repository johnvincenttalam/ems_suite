import type { TrackingTag, TrackingLog } from '@/features/tracking/types'

export const mockTrackingTags: TrackingTag[] = [
  // GPS units on vehicles
  { id: 'TAG-G001', code: 'GPS-VEH-V001', type: 'gps',  boundEntityType: 'vehicle', boundEntityId: 'V001', status: 'active', lastSeenAt: '2026-04-27T08:42:00Z', createdAt: '2025-01-10' },
  { id: 'TAG-G002', code: 'GPS-VEH-V003', type: 'gps',  boundEntityType: 'vehicle', boundEntityId: 'V003', status: 'active', lastSeenAt: '2026-04-27T08:38:00Z', createdAt: '2023-08-12' },
  { id: 'TAG-G003', code: 'GPS-VEH-V004', type: 'gps',  boundEntityType: 'vehicle', boundEntityId: 'V004', status: 'active', lastSeenAt: '2026-04-27T07:55:00Z', createdAt: '2025-02-04' },

  // RFID tags on heavy equipment
  { id: 'TAG-R001', code: 'RFID-AST-010', type: 'rfid', boundEntityType: 'asset',   boundEntityId: 'AST-010', status: 'active', lastSeenAt: '2026-04-27T07:18:00Z', createdAt: '2024-11-12' },
  { id: 'TAG-R002', code: 'RFID-AST-011', type: 'rfid', boundEntityType: 'asset',   boundEntityId: 'AST-011', status: 'active', lastSeenAt: '2026-04-26T17:10:00Z', createdAt: '2024-07-19' },

  // QR labels on inventory boxes
  { id: 'TAG-Q001', code: 'QR-INV-1003',  type: 'qr',   boundEntityType: 'item',    boundEntityId: 'INV-1003', status: 'active', lastSeenAt: '2026-04-27T10:14:00Z', createdAt: '2024-09-12' },
  { id: 'TAG-Q002', code: 'QR-INV-1007',  type: 'qr',   boundEntityType: 'item',    boundEntityId: 'INV-1007', status: 'active', lastSeenAt: '2026-04-27T14:25:00Z', createdAt: '2024-10-22' },
  { id: 'TAG-Q003', code: 'QR-INV-1009',  type: 'qr',   boundEntityType: 'item',    boundEntityId: 'INV-1009', status: 'active', lastSeenAt: '2026-04-27T08:42:00Z', createdAt: '2024-11-20' },
  { id: 'TAG-Q004', code: 'QR-INV-1011',  type: 'qr',   boundEntityType: 'item',    boundEntityId: 'INV-1011', status: 'active', lastSeenAt: '2026-04-27T11:48:00Z', createdAt: '2025-01-04' },

  // Inactive
  { id: 'TAG-Q005', code: 'QR-INV-0098',  type: 'qr',   boundEntityType: 'item',    boundEntityId: 'INV-1004', status: 'inactive',                                createdAt: '2024-09-20' },
]

export const mockTrackingLogs: TrackingLog[] = [
  // Vehicle GPS — Toyota Hilux V001: BGC HQ → Clark Freeport supply run via NLEX
  { id: 'TL-001', tagId: 'TAG-G001', entityType: 'vehicle', entityId: 'V001', latitude: 14.5547, longitude: 121.0509, locationName: 'BGC, Taguig',                  source: 'gps', timestamp: '2026-04-27T07:30:00Z' },
  { id: 'TL-002', tagId: 'TAG-G001', entityType: 'vehicle', entityId: 'V001', latitude: 14.8136, longitude: 120.8794, locationName: 'NLEX — Marilao, Bulacan',      source: 'gps', timestamp: '2026-04-27T08:12:00Z' },
  { id: 'TL-003', tagId: 'TAG-G001', entityType: 'vehicle', entityId: 'V001', latitude: 15.1684, longitude: 120.5868, locationName: 'Clark Freeport, Pampanga',     source: 'gps', timestamp: '2026-04-27T08:42:00Z' },

  // Vehicle GPS — Hyundai Staria V003: Makati ↔ Ortigas shuttle
  { id: 'TL-004', tagId: 'TAG-G002', entityType: 'vehicle', entityId: 'V003', latitude: 14.5547, longitude: 121.0244, locationName: 'Ayala Triangle, Makati',       source: 'gps', timestamp: '2026-04-27T08:14:00Z' },
  { id: 'TL-005', tagId: 'TAG-G002', entityType: 'vehicle', entityId: 'V003', latitude: 14.5879, longitude: 121.0654, locationName: 'Ortigas Center, Pasig',        source: 'gps', timestamp: '2026-04-27T08:38:00Z' },

  // Vehicle GPS — Tesla V004: investor site visit
  { id: 'TL-006', tagId: 'TAG-G003', entityType: 'vehicle', entityId: 'V004', latitude: 14.6510, longitude: 121.0489, locationName: 'Quezon City Memorial Circle',  source: 'gps', timestamp: '2026-04-27T07:55:00Z' },

  // RFID asset scans — generator at Site Alpha (Cebu)
  { id: 'TL-007', tagId: 'TAG-R001', entityType: 'asset',   entityId: 'AST-010', latitude: 10.3157, longitude: 123.8854, locationName: 'Mandaue, Cebu',             scannedBy: 'U003', source: 'scan', timestamp: '2026-04-27T07:18:00Z' },
  { id: 'TL-008', tagId: 'TAG-R001', entityType: 'asset',   entityId: 'AST-010',                                              locationName: 'Site Alpha — Generator Bay',          scannedBy: 'U003', source: 'scan', timestamp: '2026-04-26T07:08:00Z' },

  // RFID forklift scans (warehouse interior — coords omitted)
  { id: 'TL-009', tagId: 'TAG-R002', entityType: 'asset',   entityId: 'AST-011',                                              locationName: 'Cabuyao Warehouse — Bay 3',            scannedBy: 'U002', source: 'scan', timestamp: '2026-04-26T17:10:00Z' },
  { id: 'TL-010', tagId: 'TAG-R002', entityType: 'asset',   entityId: 'AST-011',                                              locationName: 'Cabuyao Warehouse — Workshop',         scannedBy: 'U002', source: 'scan', timestamp: '2026-04-26T08:14:00Z' },

  // QR scans on inventory pick events
  { id: 'TL-011', tagId: 'TAG-Q001', entityType: 'item',    entityId: 'INV-1003',                                              locationName: 'Cabuyao Warehouse — Pick Zone A',      scannedBy: 'U002', source: 'scan', timestamp: '2026-04-27T10:14:00Z' },
  { id: 'TL-012', tagId: 'TAG-Q002', entityType: 'item',    entityId: 'INV-1007',                                              locationName: 'Bulacan DC — Receiving',                scannedBy: 'U001', source: 'scan', timestamp: '2026-04-27T14:25:00Z' },
  { id: 'TL-013', tagId: 'TAG-Q003', entityType: 'item',    entityId: 'INV-1009',                                              locationName: 'Cabuyao Warehouse — Issue Counter',    scannedBy: 'U003', source: 'scan', timestamp: '2026-04-27T08:42:00Z' },
  { id: 'TL-014', tagId: 'TAG-Q004', entityType: 'item',    entityId: 'INV-1011',                                              locationName: 'Davao Cold Storage — Bay 1',           scannedBy: 'U001', source: 'scan', timestamp: '2026-04-27T11:48:00Z' },

  // Older history
  { id: 'TL-015', tagId: 'TAG-G001', entityType: 'vehicle', entityId: 'V001', latitude: 14.5547, longitude: 121.0509, locationName: 'BGC, Taguig',                 source: 'gps', timestamp: '2026-04-26T17:42:00Z' },
  { id: 'TL-016', tagId: 'TAG-Q001', entityType: 'item',    entityId: 'INV-1003',                                              locationName: 'Cabuyao Warehouse — Receiving',        scannedBy: 'U001', source: 'scan', timestamp: '2026-04-26T09:12:00Z' },
  { id: 'TL-017', tagId: 'TAG-Q003', entityType: 'item',    entityId: 'INV-1009',                                              locationName: 'Cabuyao Warehouse — Pick Zone B',      scannedBy: 'U002', source: 'scan', timestamp: '2026-04-26T11:00:00Z' },
  { id: 'TL-018', tagId: 'TAG-G003', entityType: 'vehicle', entityId: 'V004', latitude: 14.0954, longitude: 120.9614, locationName: 'Tagaytay Ridge, Cavite',      source: 'gps', timestamp: '2026-04-25T16:48:00Z' },
]
