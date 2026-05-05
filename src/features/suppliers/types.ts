export interface Supplier {
  id: string
  name: string
  contactPerson: string
  contactNumber: string
  email: string
  address: string
  status: 'active' | 'inactive'
  createdAt: string
}
