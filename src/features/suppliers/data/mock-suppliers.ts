import type { Supplier } from '@/features/suppliers/types'

export const mockSuppliers: Supplier[] = [
  { id: 'S001', name: 'Acme Industrial Supply', contactPerson: 'Robert Cole', contactNumber: '+1 415 555 0142', email: 'sales@acme-industrial.com', address: '500 Market St, San Francisco, CA', status: 'active', createdAt: '2024-08-12' },
  { id: 'S002', name: 'GlobalTech Distributors', contactPerson: 'Mei Lin', contactNumber: '+65 6700 1100', email: 'mei.lin@globaltech.sg', address: '21 Tech Park Cres, Singapore', status: 'active', createdAt: '2024-08-22' },
  { id: 'S003', name: 'Northwind Office', contactPerson: 'Erika Müller', contactNumber: '+49 30 123456', email: 'service@northwind.de', address: 'Friedrichstr 100, Berlin', status: 'active', createdAt: '2024-09-04' },
  { id: 'S004', name: 'Pacific Fleet Services', contactPerson: 'David Park', contactNumber: '+82 2 555 0190', email: 'd.park@pacfleet.kr', address: '88 Gangnam-daero, Seoul', status: 'active', createdAt: '2024-09-19' },
  { id: 'S005', name: 'Lumina Safety Co.', contactPerson: 'Sarah Patel', contactNumber: '+44 20 7946 0958', email: 'orders@lumina.co.uk', address: '14 Cromwell Rd, London', status: 'inactive', createdAt: '2024-10-08' },
  { id: 'S006', name: 'Metro Janitorial', contactPerson: 'Hassan Ali', contactNumber: '+971 4 555 7700', email: 'sales@metroclean.ae', address: 'JLT Cluster X, Dubai', status: 'active', createdAt: '2024-11-13' },
  { id: 'S007', name: 'Apex Hardware Trading', contactPerson: 'Maria Reyes', contactNumber: '+63 2 8555 0140', email: 'apex@apex-hardware.ph', address: 'Ortigas Center, Pasig', status: 'active', createdAt: '2024-12-02' },
]
