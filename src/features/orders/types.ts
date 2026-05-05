export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded'
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type OrderRegion = 'NA' | 'EU' | 'APAC' | 'LATAM'

export interface Order {
  id: string
  reference: string
  customer: string
  email: string
  amount: number
  status: OrderStatus
  priority: OrderPriority
  items: number
  createdAt: string
  region: OrderRegion
}
