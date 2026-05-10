import type { Vehicle, Trip, FuelLog } from '@/features/fleet/types'

export const mockVehicles: Vehicle[] = [
  { id: 'V001', plateNumber: 'SGX 5482 K', model: 'Toyota Hilux',           year: 2025, status: 'active',      fuelType: 'diesel',   currentOdometer: 18420, fuelCapacityLiters: 80, assignedDriverId: 'U003', linkedAssetId: 'AST-008', checklistId: 'TPL-002', nextServiceDate: '2026-05-18', createdAt: '2025-01-10' },
  { id: 'V002', plateNumber: 'SDM 7791 H', model: 'Ford Transit Van',       year: 2024, status: 'maintenance', fuelType: 'diesel',   currentOdometer: 64810, fuelCapacityLiters: 80, linkedAssetId: 'AST-009',                              checklistId: 'TPL-002', nextServiceDate: '2026-05-04', createdAt: '2024-06-04' },
  { id: 'V003', plateNumber: 'SBN 1184 J', model: 'Hyundai Staria 11-seat', year: 2023, status: 'active',      fuelType: 'diesel',   currentOdometer: 92140, fuelCapacityLiters: 75, assignedDriverId: 'U002',                                checklistId: 'TPL-002', nextServiceDate: '2026-05-29', createdAt: '2023-08-12' },
  { id: 'V004', plateNumber: 'SPK 0218 G', model: 'Tesla Model Y',          year: 2025, status: 'active',      fuelType: 'electric', currentOdometer: 11240, fuelCapacityLiters: 0,                                                            checklistId: 'TPL-002', nextServiceDate: '2026-07-12', createdAt: '2025-02-04' },
  { id: 'V005', plateNumber: 'SKE 3354 D', model: 'Toyota Vios',            year: 2022, status: 'retired',     fuelType: 'petrol',   currentOdometer: 148720, fuelCapacityLiters: 42,                                                          createdAt: '2022-04-19' },
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
  { id: 'FL-2026-0042', vehicleId: 'V001', driverId: 'U003', date: '2026-04-26', liters: 64.2, costPerLiter: 2.31, totalCost: 148.30, odometer: 18280, station: 'Shell — Marine Pkwy',          notes: 'Full tank' },
  { id: 'FL-2026-0041', vehicleId: 'V003', driverId: 'U002', date: '2026-04-26', liters: 51.8, costPerLiter: 2.31, totalCost: 119.66, odometer: 92020, station: 'Caltex — Tampines',                                  },
  { id: 'FL-2026-0040', vehicleId: 'V001', driverId: 'U003', date: '2026-04-24', liters: 48.4, costPerLiter: 2.29, totalCost: 110.84, odometer: 18142, station: 'Shell — KM 14 Highway',         notes: 'Top-up at site' },
  { id: 'FL-2026-0039', vehicleId: 'V003', driverId: 'U002', date: '2026-04-23', liters: 30.2, costPerLiter: 2.29, totalCost: 69.16,  odometer: 91904, station: 'Esso — Yio Chu Kang',                                  },
  { id: 'FL-2026-0038', vehicleId: 'V001', driverId: 'U003', date: '2026-04-22', liters: 56.0, costPerLiter: 2.27, totalCost: 127.12, odometer: 17970, station: 'Shell — Marine Pkwy',                                  },
  { id: 'FL-2026-0037', vehicleId: 'V003', driverId: 'U002', date: '2026-04-19', liters: 47.5, costPerLiter: 2.27, totalCost: 107.83, odometer: 91812, station: 'SPC — Kallang',                  notes: 'Receipt filed' },
  { id: 'FL-2026-0036', vehicleId: 'V001', driverId: 'U003', date: '2026-04-18', liters: 60.0, costPerLiter: 2.25, totalCost: 135.00, odometer: 17820, station: 'Shell — Marine Pkwy',                                  },
  { id: 'FL-2026-0035', vehicleId: 'V003', driverId: 'U002', date: '2026-04-15', liters: 49.0, costPerLiter: 2.25, totalCost: 110.25, odometer: 91720, station: 'Caltex — Tampines',                                    },
  { id: 'FL-2026-0034', vehicleId: 'V001', driverId: 'U003', date: '2026-04-12', liters: 55.5, costPerLiter: 2.22, totalCost: 123.21, odometer: 17680, station: 'Esso — KM 14 Highway',                                  },
  { id: 'FL-2026-0033', vehicleId: 'V002', driverId: 'U002', date: '2026-04-08', liters: 70.4, costPerLiter: 2.22, totalCost: 156.29, odometer: 64500, station: 'Shell — Marine Pkwy',           notes: 'Pre-service top-up' },
]
