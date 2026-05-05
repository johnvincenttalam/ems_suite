import type { Order, OrderPriority, OrderRegion, OrderStatus } from '@/features/orders/types'

const customers = [
  ['Ada Lovelace', 'ada@example.com'],
  ['Grace Hopper', 'grace@example.com'],
  ['Alan Turing', 'alan@example.com'],
  ['Katherine Johnson', 'katherine@example.com'],
  ['Tim Berners-Lee', 'tim@example.com'],
  ['Margaret Hamilton', 'margaret@example.com'],
  ['Linus Torvalds', 'linus@example.com'],
  ['Donald Knuth', 'don@example.com'],
  ['Barbara Liskov', 'barbara@example.com'],
  ['Dennis Ritchie', 'dennis@example.com'],
]

const statuses: OrderStatus[] = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded']
const priorities: OrderPriority[] = ['low', 'medium', 'high', 'urgent']
const regions: OrderRegion[] = ['NA', 'EU', 'APAC', 'LATAM']

function seededRandom(seed: number) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

export function generateOrders(count = 48): Order[] {
  const rnd = seededRandom(42)
  const orders: Order[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const [customer, email] = customers[Math.floor(rnd() * customers.length)]
    const daysAgo = Math.floor(rnd() * 90)
    orders.push({
      id: String(i + 1),
      reference: `ORD-${String(1000 + i).padStart(4, '0')}`,
      customer,
      email,
      amount: Math.floor(rnd() * 5000) + 50,
      status: statuses[Math.floor(rnd() * statuses.length)],
      priority: priorities[Math.floor(rnd() * priorities.length)],
      items: Math.floor(rnd() * 8) + 1,
      createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      region: regions[Math.floor(rnd() * regions.length)],
    })
  }
  return orders
}

export const mockOrders = generateOrders()
