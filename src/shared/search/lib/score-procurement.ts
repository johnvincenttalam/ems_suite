import { ShoppingCart } from 'lucide-react'
import type { RequestWithItems } from '@/features/procurement'
import { scoreFields, tokenize, type GlobalSearchHit } from './types'

export function scoreProcurementRequests(
  requests: RequestWithItems[],
  query: string,
): GlobalSearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: GlobalSearchHit[] = []
  for (const r of requests) {
    const { score, matched } = scoreFields(tokens, [
      { text: r.id.toLowerCase(), weight: 10 },
      ...(r.notes ? [{ text: r.notes.toLowerCase(), weight: 4 }] : []),
      { text: r.requesterId.toLowerCase(), weight: 1 },
      { text: r.departmentId.toLowerCase(), weight: 1 },
      ...(r.supplierId ? [{ text: r.supplierId.toLowerCase(), weight: 1 }] : []),
    ])
    if (!matched || score === 0) continue
    hits.push({
      id: `request:${r.id}`,
      type: 'request',
      score,
      title: r.notes || r.id,
      subtitle: r.id,
      meta: `${r.status} · ${r.items.length} line${r.items.length === 1 ? '' : 's'}`,
      icon: ShoppingCart,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      link: `/module/procurement/requests?req=${r.id}`,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}
