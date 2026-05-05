import type { Category } from '@/features/categories/types'

export const mockCategories: Category[] = [
  { id: 'C001', name: 'IT Equipment', type: 'asset', description: 'Laptops, desktops, peripherals', itemCount: 142, createdAt: '2024-08-12' },
  { id: 'C002', name: 'Furniture', type: 'asset', description: 'Desks, chairs, cabinets', itemCount: 87, createdAt: '2024-08-12' },
  { id: 'C003', name: 'Vehicles', type: 'asset', description: 'Company cars, trucks', itemCount: 12, createdAt: '2024-09-01' },
  { id: 'C004', name: 'Heavy Machinery', type: 'asset', description: 'Forklifts, generators', itemCount: 18, createdAt: '2024-09-15' },
  { id: 'C005', name: 'Office Supplies', type: 'inventory', description: 'Paper, pens, toner', itemCount: 56, createdAt: '2024-08-20' },
  { id: 'C006', name: 'Cleaning Supplies', type: 'inventory', description: 'Detergents, disposables', itemCount: 32, createdAt: '2024-09-04' },
  { id: 'C007', name: 'Spare Parts', type: 'inventory', description: 'Maintenance and repair items', itemCount: 211, createdAt: '2024-10-11' },
  { id: 'C008', name: 'Safety Gear', type: 'inventory', description: 'PPE and safety equipment', itemCount: 64, createdAt: '2024-11-02' },
]
