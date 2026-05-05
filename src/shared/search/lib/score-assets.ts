import { Package } from 'lucide-react'
import type { Asset } from '@/features/assets'
import { scoreFields, tokenize, type GlobalSearchHit } from './types'

export function scoreAssets(assets: Asset[], query: string): GlobalSearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: GlobalSearchHit[] = []
  for (const a of assets) {
    const { score, matched } = scoreFields(tokens, [
      { text: a.id.toLowerCase(), weight: 10 },
      { text: a.serialNumber.toLowerCase(), weight: 10 },
      { text: a.name.toLowerCase(), weight: 5 },
    ])
    if (!matched || score === 0) continue
    hits.push({
      id: `asset:${a.id}`,
      type: 'asset',
      score,
      title: a.name,
      subtitle: a.serialNumber,
      meta: a.status,
      icon: Package,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      link: `/module/assets/registry?asset=${a.id}`,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}
