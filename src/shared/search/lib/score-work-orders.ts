import { Wrench } from 'lucide-react'
import type { WorkOrder } from '@/features/maintenance'
import { scoreFields, tokenize, type GlobalSearchHit } from './types'

export function scoreWorkOrders(workOrders: WorkOrder[], query: string): GlobalSearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: GlobalSearchHit[] = []
  for (const wo of workOrders) {
    const { score, matched } = scoreFields(tokens, [
      { text: wo.id.toLowerCase(), weight: 10 },
      { text: wo.title.toLowerCase(), weight: 5 },
      ...(wo.description ? [{ text: wo.description.toLowerCase(), weight: 3 }] : []),
      { text: (wo.assetId ?? wo.vehicleId ?? '').toLowerCase(), weight: 2 },
      { text: wo.assignedTo.toLowerCase(), weight: 1 },
    ])
    if (!matched || score === 0) continue
    hits.push({
      id: `wo:${wo.id}`,
      type: 'work_order',
      score,
      title: wo.title,
      subtitle: wo.id,
      meta: `${wo.status} · ${wo.priority} priority`,
      icon: Wrench,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      link: `/module/maintenance/work-orders?wo=${wo.id}`,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}
