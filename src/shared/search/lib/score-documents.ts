import { FileText } from 'lucide-react'
import type { AppDocument } from '@/features/documents'
import { getDocumentBody } from '@/features/documents/data/mock-document-bodies'
import { extractSnippet } from '@/features/documents/lib/extract-snippet'
import { scoreFields, tokenize, type GlobalSearchHit } from './types'

export function scoreDocuments(documents: AppDocument[], query: string): GlobalSearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: GlobalSearchHit[] = []
  for (const doc of documents) {
    // Body text comes from one of two sources: the live `bodyText` on the
    // document (set by PDF extraction at upload) or, for seeded docs, the
    // hand-authored content in mock-document-bodies. Either is optional.
    const body = doc.bodyText ?? getDocumentBody(doc.id)

    const { score, matched } = scoreFields(tokens, [
      { text: doc.id.toLowerCase(), weight: 10 },
      ...(doc.trackingNumber ? [{ text: doc.trackingNumber.toLowerCase(), weight: 10 }] : []),
      { text: doc.title.toLowerCase(), weight: 5 },
      ...(doc.tags && doc.tags.length > 0 ? [{ text: doc.tags.join(' ').toLowerCase(), weight: 3 }] : []),
      ...(doc.description ? [{ text: doc.description.toLowerCase(), weight: 2 }] : []),
      ...(doc.receipt?.senderSource ? [{ text: doc.receipt.senderSource.toLowerCase(), weight: 2 }] : []),
      ...(body ? [{ text: body.toLowerCase(), weight: 2 }] : []),
      { text: doc.fileName.toLowerCase(), weight: 1 },
    ])
    if (!matched || score === 0) continue

    // Build a body snippet so palette consumers can show *why* the document
    // matched. extractSnippet returns empty when the match was elsewhere
    // (title, tags, etc.) — those hits stay snippet-less and the UI just
    // renders title + subtitle as before.
    const { snippet, matches } = body
      ? extractSnippet(body, tokens)
      : { snippet: '', matches: [] }

    hits.push({
      id: `document:${doc.id}`,
      type: 'document',
      score,
      title: doc.title,
      subtitle: doc.trackingNumber ?? doc.id,
      meta: doc.status,
      snippet: snippet || undefined,
      matches: snippet ? matches : undefined,
      icon: FileText,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      link: `/module/sdms/documents/${doc.id}`,
    })
  }

  return hits.sort((a, b) => b.score - a.score)
}
