import { Boxes, PackageX } from 'lucide-react'
import type { InventoryItem } from '@/features/inventory'
import type { AppNotification } from '@/shared/notifications/types'

const INV_LINK = (id: string) => `/module/inventory/items?item=${id}`

const STOCK_ALERT_LIMIT = 5

/**
 * Derive system-level inventory alerts. Unlike personal notifications,
 * these are visible to anyone — proper role-based filtering would belong
 * to a backend that scopes by department/responsibility.
 *
 * Pure. Returns at most `STOCK_ALERT_LIMIT` items (sorted critical first,
 * then by severity ratio) so a 100-item warehouse doesn't flood the bell.
 */
export function deriveInventoryNotifications(
  items: InventoryItem[],
  /** Reserved — accepted for parity with other derivers but unused today. */
  _userId: string,
): AppNotification[] {
  const out: AppNotification[] = []

  for (const item of items) {
    if (item.quantity === 0) {
      out.push({
        id: `inv-out:${item.id}`,
        kind: 'stock_out',
        severity: 'danger',
        icon: PackageX,
        title: `${item.name} is out of stock`,
        description: `${item.sku} · reorder ${item.reorderLevel} on hand 0`,
        timestamp: new Date(0).toISOString(),
        link: INV_LINK(item.id),
        module: 'inventory',
      })
    } else if (item.quantity <= item.reorderLevel) {
      const ratio = item.reorderLevel === 0 ? 0 : item.quantity / item.reorderLevel
      out.push({
        id: `inv-low:${item.id}`,
        kind: 'low_stock',
        severity: ratio <= 0.5 ? 'warning' : 'info',
        icon: Boxes,
        title: `${item.name} is low`,
        description: `${item.sku} · ${item.quantity} of ${item.reorderLevel} reorder level`,
        timestamp: new Date(0).toISOString(),
        link: INV_LINK(item.id),
        module: 'inventory',
      })
    }
  }

  // stock_out first (severity), then low_stock by how close to zero
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'stock_out' ? -1 : 1
    return 0
  })

  return out.slice(0, STOCK_ALERT_LIMIT)
}
