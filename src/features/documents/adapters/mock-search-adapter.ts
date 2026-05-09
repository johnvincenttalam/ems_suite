import type { AppDocument } from '@/features/documents/types'
import { mockDocuments } from '@/features/documents/data/mock-documents'
import { getDocumentBody } from '@/features/documents/data/mock-document-bodies'
import { extractSnippet } from '@/features/documents/lib/extract-snippet'
import type { SearchAdapter, SmartSearchOpts, SmartSearchResult } from './search-adapter'

/**
 * Common English stopwords — discarded during tokenization so common words
 * ("with", "the") don't dominate scoring. Intentionally small; an over-eager
 * stopword list hurts short queries.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'by', 'for', 'with', 'about', 'as', 'to', 'from', 'in', 'on',
  'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those', 'i', 'you',
  'we', 'they', 'it', 'its', 'their', 'my', 'your',
])

/** Lowercase, strip punctuation, drop stopwords + 1-char tokens. */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** Per-band weights — title hits matter more than body hits. */
const WEIGHTS = {
  title: 3,
  tags: 2,
  category: 2,
  body: 1,
} as const

/**
 * Rough TF-IDF-style document score. For each query token:
 *   per-band-hits × band-weight ÷ √(bodyLength + 1)
 * Length normalization stops a long body from outscoring a tight title match
 * just because it has more text to match against.
 */
function scoreDocument(doc: AppDocument, queryTokens: string[]): {
  score: number
  matchedIn: SmartSearchResult['matchedIn']
} {
  if (queryTokens.length === 0) return { score: 0, matchedIn: 'title' }

  const titleTokens = tokenize(doc.title)
  const tagTokens = tokenize((doc.tags ?? []).join(' '))
  const categoryTokens = doc.category ? tokenize(doc.category) : []
  // Live extracted text wins; fall back to seeded mock-bodies for the
  // hand-authored seed documents that don't have an uploaded file.
  const body = doc.bodyText ?? getDocumentBody(doc.id)
  const bodyTokens = tokenize(body)

  let titleHits = 0
  let tagHits = 0
  let categoryHits = 0
  let bodyHits = 0

  for (const qt of queryTokens) {
    titleHits += titleTokens.filter((t) => t.includes(qt) || qt.includes(t)).length
    tagHits += tagTokens.filter((t) => t.includes(qt) || qt.includes(t)).length
    categoryHits += categoryTokens.filter((t) => t.includes(qt) || qt.includes(t)).length
    bodyHits += bodyTokens.filter((t) => t.includes(qt) || qt.includes(t)).length
  }

  const lengthNorm = Math.sqrt(bodyTokens.length + 1)
  const raw =
    titleHits * WEIGHTS.title +
    tagHits * WEIGHTS.tags +
    categoryHits * WEIGHTS.category +
    (bodyHits * WEIGHTS.body) / lengthNorm

  // Squash to [0, 1] with a soft saturation so high-coverage docs don't pin
  // at 1.0; closer to actual cosine-similarity behavior.
  const score = 1 - Math.exp(-raw / 6)

  // Determine the band the user should see credit for — highest-weighted
  // band that produced any hits.
  let matchedIn: SmartSearchResult['matchedIn'] = 'body'
  if (titleHits > 0) matchedIn = 'title'
  else if (tagHits > 0) matchedIn = 'tags'
  else if (categoryHits > 0) matchedIn = 'category'

  return { score, matchedIn }
}

/**
 * Mock SearchAdapter. Honest about being keyword-based; the swap to a real
 * AI / vector backend is a different SearchAdapter implementation behind the
 * same interface.
 */
export const mockSearchAdapter: SearchAdapter = {
  modeLabel: 'Demo · keyword-relevance',

  async search(query, opts: SmartSearchOpts = {}): Promise<SmartSearchResult[]> {
    // Simulate network — keeps the UX honest about loading states.
    await new Promise((r) => setTimeout(r, 180))

    const tokens = tokenize(query)
    if (tokens.length === 0) return []

    const limit = opts.limit ?? 25

    const results = mockDocuments
      // Phase 2 metadata filter, exposed in Phase 1 for type-stability.
      .filter((d) => !opts.category || d.category === opts.category)
      // Light RBAC: confidential docs are gated to the document creator and
      // approvers. Regular and internal docs are visible to anyone.
      .filter((d) => {
        if (d.confidentiality !== 'confidential') return true
        if (!opts.ownerName) return false
        return d.createdBy === opts.ownerName || d.approvers.includes(opts.ownerName)
      })
      .map((doc) => {
        const { score, matchedIn } = scoreDocument(doc, tokens)
        const body = doc.bodyText ?? getDocumentBody(doc.id)
        const { snippet, matches } = extractSnippet(body, tokens)
        return { document: doc, score, snippet, matches, matchedIn }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => {
        // Tie-break by recency
        if (b.score !== a.score) return b.score - a.score
        return b.document.createdAt.localeCompare(a.document.createdAt)
      })
      .slice(0, limit)

    return results
  },
}
