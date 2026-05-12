import type { InventoryItem, StockMovement } from '@/features/inventory'
import type { Insight } from '@/shared/insights/types'

/**
 * Insights about inventory health and consumption. Mid-day check-ins (low
 * stock, reorder pressure) bubble up at warning/critical, baseline figures
 * (top-consumed item) stay at info.
 */
export function deriveInventoryInsights(
  items: InventoryItem[],
  movements: StockMovement[],
  now: Date = new Date(),
): Insight[] {
  const insights: Insight[] = []

  const lowStock = items.filter((i) => i.quantity <= i.reorderLevel)
  if (lowStock.length > 0) {
    const critical = lowStock.filter((i) => i.quantity <= i.reorderLevel * 0.25)
    insights.push({
      id: 'inv:low-stock',
      message:
        critical.length > 0
          ? `${lowStock.length} items below reorder — ${critical.length} critically low (≤ 25% of level)`
          : `${lowStock.length} item${lowStock.length === 1 ? '' : 's'} below reorder level`,
      severity: critical.length > 0 ? 'critical' : 'warning',
      module: 'inventory',
      metric: `${lowStock.length}`,
      href: '/module/inventory/alerts',
    })
  }

  // Top consumed item this month (by stock-out quantity, applied only).
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const consumption = new Map<string, number>()
  for (const m of movements) {
    if (m.type !== 'out' || m.status !== 'applied') continue
    if (m.createdAt < monthStart) continue
    consumption.set(m.itemId, (consumption.get(m.itemId) ?? 0) + m.quantity)
  }
  if (consumption.size > 0) {
    const top = Array.from(consumption.entries()).sort((a, b) => b[1] - a[1])[0]
    const item = items.find((i) => i.id === top[0])
    if (item) {
      insights.push({
        id: 'inv:top-consumed',
        message: `Top consumed item this month: ${item.name} (${top[1]} units)`,
        severity: 'info',
        module: 'inventory',
      })
    }
  }

  return insights
}
