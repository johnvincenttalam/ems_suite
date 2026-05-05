import type { Department } from '@/features/departments/types'

export const mockDepartments: Department[] = [
  { id: 'D001', name: 'Operations', code: 'OPS', manager: 'Jane Doe', headcount: 28, createdAt: '2024-08-12' },
  { id: 'D002', name: 'Information Technology', code: 'IT', manager: 'John Smith', headcount: 14, createdAt: '2024-08-12' },
  { id: 'D003', name: 'Finance', code: 'FIN', manager: 'Maria Garcia', headcount: 9, createdAt: '2024-09-01' },
  { id: 'D004', name: 'Human Resources', code: 'HR', manager: 'Sam Tan', headcount: 6, createdAt: '2024-09-15' },
  { id: 'D005', name: 'Procurement', code: 'PRC', manager: 'Liu Wei', headcount: 7, createdAt: '2024-10-03' },
  { id: 'D006', name: 'Maintenance', code: 'MNT', manager: 'Carlos Reyes', headcount: 22, createdAt: '2024-10-22' },
  { id: 'D007', name: 'Logistics', code: 'LOG', manager: 'Ahmed Khan', headcount: 18, createdAt: '2024-11-04' },
  { id: 'D008', name: 'Quality Assurance', code: 'QA', manager: 'Priya Sharma', headcount: 5, createdAt: '2025-01-09' },
]
