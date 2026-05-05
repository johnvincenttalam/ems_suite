import { FileText } from 'lucide-react'
import type { AppDocument } from '@/features/documents'
import { scoreFields, tokenize, type GlobalSearchHit } from './types'

export function scoreDocuments(documents: AppDocument[], query: string): GlobalSearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: GlobalSearchHit[] = []
  for (const doc of documents) {
    const { score, matched } = scoreFields(tokens, [
      { text: doc.id.toLowerCase(), weight: 10 },
      ...(doc.trackingNumber ? [{ text: doc.trackingNumber.toLowerCase(), weight: 10 }] : []),
      { text: doc.title.toLowerCase(), weight: 5 },
      ...(doc.tags && doc.tags.length > 0 ? [{ text: doc.tags.join(' ').toLowerCase(), weight: 3 }] : []),
      ...(doc.description ? [{ text: doc.description.toLowerCase(), weight: 2 }] : []),
      ...(doc.receipt?.senderSource ? [{ text: doc.receipt.senderSource.toLowerCase(), weight: 2 }] : []),
      { text: doc.fileName.toLowerCase(), weight: 1 },
    ])
    if (!matched || score === 0) continue
    hits.push({
      id: `document:${doc.id}`,
      type: 'document',
      score,
      title: doc.title,
      subtitle: doc.trackingNumber ?? doc.id,
      meta: doc.status,
      icon: FileText,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      link: `/module/sdms/documents?doc=${doc.id}`,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}
