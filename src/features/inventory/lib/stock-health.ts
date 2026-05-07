import type { InventoryItem } from '@/features/inventory/types'

export type StockHealth = 'healthy' | 'low' | 'critical' | 'out'

interface Thresholds {
  reorderWarningPercent: number
  criticalPercent: number
}

/**
 * Classify an item's stock health using the configured percent thresholds.
 *
 * - out:      quantity is 0
 * - critical: quantity > 0 and at or below criticalPercent of reorderLevel
 * - low:      quantity > 0 and at or below reorderWarningPercent of reorderLevel
 * - healthy:  otherwise
 *
 * Items with reorderLevel = 0 are always healthy (unless they're 0 on hand).
 */
export function getStockHealth(
  item: Pick<InventoryItem, 'quantity' | 'reorderLevel'>,
  thresholds: Thresholds,
): StockHealth {
  if (item.quantity <= 0) return 'out'
  if (item.reorderLevel <= 0) return 'healthy'
  const criticalAt = item.reorderLevel * (thresholds.criticalPercent / 100)
  const warningAt = item.reorderLevel * (thresholds.reorderWarningPercent / 100)
  if (item.quantity <= criticalAt) return 'critical'
  if (item.quantity <= warningAt) return 'low'
  return 'healthy'
}
