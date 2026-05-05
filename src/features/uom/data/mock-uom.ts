import type { Uom } from '@/features/uom/types'

export const mockUom: Uom[] = [
  { id: 'U001', name: 'Piece', symbol: 'pc', description: 'Single unit / item', createdAt: '2024-08-12' },
  { id: 'U002', name: 'Box', symbol: 'box', description: 'Boxed package', createdAt: '2024-08-12' },
  { id: 'U003', name: 'Pack', symbol: 'pk', createdAt: '2024-08-12' },
  { id: 'U004', name: 'Kilogram', symbol: 'kg', description: 'Weight', createdAt: '2024-08-13' },
  { id: 'U005', name: 'Gram', symbol: 'g', description: 'Weight', createdAt: '2024-08-13' },
  { id: 'U006', name: 'Liter', symbol: 'L', description: 'Volume', createdAt: '2024-08-15' },
  { id: 'U007', name: 'Milliliter', symbol: 'mL', description: 'Volume', createdAt: '2024-08-15' },
  { id: 'U008', name: 'Meter', symbol: 'm', description: 'Length', createdAt: '2024-09-01' },
  { id: 'U009', name: 'Centimeter', symbol: 'cm', description: 'Length', createdAt: '2024-09-01' },
  { id: 'U010', name: 'Set', symbol: 'set', description: 'A grouped collection', createdAt: '2024-09-15' },
]
