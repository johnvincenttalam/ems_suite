import { Boxes } from 'lucide-react'
import type { InventoryItem } from '@/features/inventory'
import { scoreFields, tokenize, type GlobalSearchHit } from './types'

export function scoreInventoryItems(items: InventoryItem[], query: string): GlobalSearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: GlobalSearchHit[] = []
  for (const item of items) {
    const { score, matched } = scoreFields(tokens, [
      { text: item.id.toLowerCase(), weight: 10 },
      { text: item.sku.toLowerCase(), weight: 10 },
      { text: item.name.toLowerCase(), weight: 5 },
      ...(item.description ? [{ text: item.description.toLowerCase(), weight: 2 }] : []),
    ])
    if (!matched || score === 0) continue
    const lowStock = item.quantity <= item.reorderLevel
    hits.push({
      id: `inv:${item.id}`,
      type: 'inventory_item',
      score,
      title: item.name,
      subtitle: item.sku,
      meta: lowStock ? `${item.quantity}/${item.reorderLevel} — low stock` : `${item.quantity} on hand`,
      icon: Boxes,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      link: `/module/inventory/items?item=${item.id}`,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}
