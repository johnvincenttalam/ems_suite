import type { Vehicle, Trip, FuelLog, VehicleInspection, VehicleAssignment } from '@/features/fleet/types'

export const mockVehicles: Vehicle[] = [
  { id: 'V001', plateNumber: 'SGX 5482 K', model: 'Toyota Hilux',           year: 2025, status: 'active',      fuelType: 'diesel',   currentOdometer: 18420, fuelCapacityLiters: 80, assignedDriverId: 'DRV-003', linkedAssetId: 'AST-008', checklistId: 'TPL-002', nextServiceDate: '2026-05-18', photoUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&q=80', createdAt: '2025-01-10' },
  { id: 'V002', plateNumber: 'SDM 7791 H', model: 'Ford Transit Van',       year: 2024, status: 'maintenance', fuelType: 'diesel',   currentOdometer: 64810, fuelCapacityLiters: 80, linkedAssetId: 'AST-009',                                  checklistId: 'TPL-002', nextServiceDate: '2026-05-04', photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&q=80', createdAt: '2024-06-04' },
  { id: 'V003', plateNumber: 'SBN 1184 J', model: 'Hyundai Staria 11-seat', year: 2023, status: 'active',      fuelType: 'diesel',   currentOdometer: 92140, fuelCapacityLiters: 75, assignedDriverId: 'DRV-002',                                  checklistId: 'TPL-002', nextServiceDate: '2026-05-29', photoUrl: 'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?w=400&q=80', createdAt: '2023-08-12' },
  { id: 'V004', plateNumber: 'SPK 0218 G', model: 'Tesla Model Y',          year: 2025, status: 'active',      fuelType: 'electric', currentOdometer: 11240, fuelCapacityLiters: 0,                                                                  checklistId: 'TPL-002', nextServiceDate: '2026-07-12', photoUrl: 'https://images.unsplash.com/photo-1617704548623-340376564e68?w=400&q=80', createdAt: '2025-02-04' },
  { id: 'V005', plateNumber: 'SKE 3354 D', model: 'Toyota Vios',            year: 2022, status: 'retired',     fuelType: 'petrol',   currentOdometer: 148720, fuelCapacityLiters: 42,                                                                photoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80', createdAt: '2022-04-19' },
]

export const mockTrips: Trip[] = [
  { id: 'TR-2026-0091', vehicleId: 'V001', driverId: 'DRV-003', startTime: '2026-04-27T07:30:00Z',                                  startOdometer: 18280,                       distance: 0,    purpose: 'Site Alpha — generator parts delivery',  status: 'in_progress' },
  { id: 'TR-2026-0090', vehicleId: 'V003', driverId: 'DRV-002', startTime: '2026-04-27T08:14:00Z',                                  startOdometer: 92020,                       distance: 0,    purpose: 'HQ — North DC shuttle',                  status: 'in_progress' },
  { id: 'TR-2026-0089', vehicleId: 'V001', driverId: 'DRV-003', startTime: '2026-04-26T08:00:00Z', endTime: '2026-04-26T17:42:00Z', startOdometer: 18142, endOdometer: 18280, distance: 138,  purpose: 'Site Alpha — quarterly inspection',      status: 'completed' },
  { id: 'TR-2026-0088', vehicleId: 'V003', driverId: 'DRV-002', startTime: '2026-04-26T09:14:00Z', endTime: '2026-04-26T15:30:00Z', startOdometer: 91904, endOdometer: 92020, distance: 116,  purpose: 'Airport pickup — vendor delegation',     status: 'completed' },
  { id: 'TR-2026-0087', vehicleId: 'V004', driverId: 'DRV-001', startTime: '2026-04-25T13:00:00Z', endTime: '2026-04-25T16:48:00Z', startOdometer: 11168, endOdometer: 11240, distance: 72,   purpose: 'Investor site visit',                    status: 'completed' },
  { id: 'TR-2026-0086', vehicleId: 'V001', driverId: 'DRV-004', startTime: '2026-04-24T07:30:00Z', endTime: '2026-04-24T18:14:00Z', startOdometer: 17970, endOdometer: 18142, distance: 172,  purpose: 'Vendor pickup — Acme Industrial',        status: 'completed' },
  { id: 'TR-2026-0085', vehicleId: 'V003', driverId: 'DRV-002', startTime: '2026-04-23T07:30:00Z', endTime: '2026-04-23T13:08:00Z', startOdometer: 91812, endOdometer: 91904, distance: 92,   purpose: 'Office shuttle — North campus',          status: 'completed' },
  { id: 'TR-2026-0084', vehicleId: 'V001', driverId: 'DRV-006', startTime: '2026-04-22T08:00:00Z', endTime: '2026-04-22T16:30:00Z', startOdometer: 17820, endOdometer: 17970, distance: 150,  purpose: 'Site Alpha — supply run',                status: 'completed' },
  { id: 'TR-2026-0083', vehicleId: 'V003', driverId: 'DRV-005', startTime: '2026-04-21T08:00:00Z',                                  startOdometer: 91720,                       distance: 0,    purpose: 'Vendor pickup — cancelled by dispatcher',status: 'cancelled' },
]

export const mockFuelLogs: FuelLog[] = [
  { id: 'FL-2026-0042', vehicleId: 'V001', driverId: 'DRV-003', date: '2026-04-26', liters: 64.2, costPerLiter: 2.31, totalCost: 148.30, odometer: 18280, station: 'Shell — Marine Pkwy',          notes: 'Full tank' },
  { id: 'FL-2026-0041', vehicleId: 'V003', driverId: 'DRV-002', date: '2026-04-26', liters: 51.8, costPerLiter: 2.31, totalCost: 119.66, odometer: 92020, station: 'Caltex — Tampines',                                  },
  { id: 'FL-2026-0040', vehicleId: 'V001', driverId: 'DRV-003', date: '2026-04-24', liters: 48.4, costPerLiter: 2.29, totalCost: 110.84, odometer: 18142, station: 'Shell — KM 14 Highway',         notes: 'Top-up at site' },
  { id: 'FL-2026-0039', vehicleId: 'V003', driverId: 'DRV-002', date: '2026-04-23', liters: 30.2, costPerLiter: 2.29, totalCost: 69.16,  odometer: 91904, station: 'Esso — Yio Chu Kang',                                  },
  { id: 'FL-2026-0038', vehicleId: 'V001', driverId: 'DRV-003', date: '2026-04-22', liters: 56.0, costPerLiter: 2.27, totalCost: 127.12, odometer: 17970, station: 'Shell — Marine Pkwy',                                  },
  { id: 'FL-2026-0037', vehicleId: 'V003', driverId: 'DRV-002', date: '2026-04-19', liters: 47.5, costPerLiter: 2.27, totalCost: 107.83, odometer: 91812, station: 'SPC — Kallang',                  notes: 'Receipt filed' },
  { id: 'FL-2026-0036', vehicleId: 'V001', driverId: 'DRV-003', date: '2026-04-18', liters: 60.0, costPerLiter: 2.25, totalCost: 135.00, odometer: 17820, station: 'Shell — Marine Pkwy',                                  },
  { id: 'FL-2026-0035', vehicleId: 'V003', driverId: 'DRV-002', date: '2026-04-15', liters: 49.0, costPerLiter: 2.25, totalCost: 110.25, odometer: 91720, station: 'Caltex — Tampines',                                    },
  { id: 'FL-2026-0034', vehicleId: 'V001', driverId: 'DRV-003', date: '2026-04-12', liters: 55.5, costPerLiter: 2.22, totalCost: 123.21, odometer: 17680, station: 'Esso — KM 14 Highway',                                  },
  { id: 'FL-2026-0033', vehicleId: 'V002', driverId: 'DRV-002', date: '2026-04-08', liters: 70.4, costPerLiter: 2.22, totalCost: 156.29, odometer: 64500, station: 'Shell — Marine Pkwy',           notes: 'Pre-service top-up' },
]

export const mockVehicleAssignments: VehicleAssignment[] = [
  // V001 history — currently DRV-003
  { id: 'VA-2026-0008', vehicleId: 'V001', driverId: 'DRV-003', assignedDate: '2026-01-12', assignedByUserId: 'U002', notes: 'Long-term assignment for Site Alpha runs' },
  { id: 'VA-2026-0007', vehicleId: 'V001', driverId: 'DRV-006', assignedDate: '2025-09-14', returnedDate: '2026-01-11', assignedByUserId: 'U002', returnedByUserId: 'U002', notes: 'Returned when DRV-003 came back from leave' },

  // V003 history — currently DRV-002
  { id: 'VA-2026-0006', vehicleId: 'V003', driverId: 'DRV-002', assignedDate: '2025-11-04', assignedByUserId: 'U002', notes: 'Permanent shuttle driver' },

  // V002 - in maintenance, no current driver, but had history
  { id: 'VA-2026-0005', vehicleId: 'V002', driverId: 'DRV-004', assignedDate: '2025-07-22', returnedDate: '2026-04-08', assignedByUserId: 'U002', returnedByUserId: 'U002', notes: 'Returned when vehicle went to maintenance' },

  // V004 (Tesla) — no current assigned driver, used as pool car
  { id: 'VA-2026-0004', vehicleId: 'V004', driverId: 'DRV-001', assignedDate: '2025-03-04', returnedDate: '2025-09-01', assignedByUserId: 'U001', returnedByUserId: 'U001', notes: 'Investor visit pool — released back to general pool' },

  // V005 — retired vehicle, archived assignments
  { id: 'VA-2026-0003', vehicleId: 'V005', driverId: 'DRV-005', assignedDate: '2024-08-12', returnedDate: '2025-06-30', assignedByUserId: 'U002', returnedByUserId: 'U002' },
  { id: 'VA-2026-0002', vehicleId: 'V005', driverId: 'DRV-007', assignedDate: '2023-03-04', returnedDate: '2024-08-12', assignedByUserId: 'U002', returnedByUserId: 'U002' },
  { id: 'VA-2026-0001', vehicleId: 'V005', driverId: 'DRV-001', assignedDate: '2022-04-19', returnedDate: '2023-03-04', assignedByUserId: 'U001', returnedByUserId: 'U001', notes: 'First driver after registration' },
]

export const mockVehicleInspections: VehicleInspection[] = [
  { id: 'VI-2026-0012', vehicleId: 'V001', inspectorDriverId: 'DRV-003', date: '2026-04-26', result: 'pass',      itemsTotal: 8, itemsPassed: 8, tripId: 'TR-2026-0089', createdAt: '2026-04-26T07:55:00Z', notes: 'All checks clear before Site Alpha run' },
  { id: 'VI-2026-0011', vehicleId: 'V003', inspectorDriverId: 'DRV-002', date: '2026-04-26', result: 'pass',      itemsTotal: 8, itemsPassed: 8, tripId: 'TR-2026-0088', createdAt: '2026-04-26T09:08:00Z' },
  { id: 'VI-2026-0010', vehicleId: 'V001', inspectorDriverId: 'DRV-003', date: '2026-04-24', result: 'attention', itemsTotal: 8, itemsPassed: 7, tripId: 'TR-2026-0086', createdAt: '2026-04-24T07:24:00Z', notes: 'Wiper streak — replacement scheduled' },
  { id: 'VI-2026-0009', vehicleId: 'V003', inspectorDriverId: 'DRV-002', date: '2026-04-23', result: 'pass',      itemsTotal: 8, itemsPassed: 8, tripId: 'TR-2026-0085', createdAt: '2026-04-23T07:18:00Z' },
  { id: 'VI-2026-0008', vehicleId: 'V001', inspectorDriverId: 'DRV-006', date: '2026-04-22', result: 'pass',      itemsTotal: 8, itemsPassed: 8, tripId: 'TR-2026-0084', createdAt: '2026-04-22T07:48:00Z' },
  { id: 'VI-2026-0007', vehicleId: 'V002', inspectorDriverId: 'DRV-004', date: '2026-04-15', result: 'fail',      itemsTotal: 8, itemsPassed: 5, createdAt: '2026-04-15T08:10:00Z', notes: 'Coolant leak + brake pad wear — sent to maintenance' },
  { id: 'VI-2026-0006', vehicleId: 'V004', inspectorDriverId: 'DRV-001', date: '2026-04-25', result: 'pass',      itemsTotal: 6, itemsPassed: 6, tripId: 'TR-2026-0087', createdAt: '2026-04-25T12:42:00Z' },
  { id: 'VI-2026-0005', vehicleId: 'V003', inspectorDriverId: 'DRV-002', date: '2026-04-19', result: 'pass',      itemsTotal: 8, itemsPassed: 8, createdAt: '2026-04-19T07:30:00Z' },
]
