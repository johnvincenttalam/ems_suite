import type { AppDocument, DocumentCategory } from '@/features/documents/types'

/**
 * Single result row returned by the search adapter. The structure intentionally
 * mirrors what a real semantic search backend would return so the swap to a
 * production AI service is just a different SearchAdapter implementation.
 */
export interface SmartSearchResult {
  document: AppDocument
  /** Normalized similarity score in [0, 1]. Mock scoring approximates this; a
   * real adapter would return cosine similarity from a vector database. */
  score: number
  /** Best-matching ~140-char snippet of bodyText with token positions
   * highlighted by `match` ranges. Empty when the doc has no body or matched
   * only on title/tags. */
  snippet: string
  /** Character ranges within `snippet` (start, end exclusive) where query
   * tokens were matched. UI bolds these ranges. */
  matches: Array<[number, number]>
  /** Where the match landed — drives the badge in the UI ("matched in title /
   * body / tags / category"). When multiple bands match, this is the
   * highest-weighted band. */
  matchedIn: 'title' | 'body' | 'tags' | 'category'
}

export interface SmartSearchOpts {
  /** Owner / requester display name. Used by the adapter to apply RBAC at
   * the result-set level — the real backend would do the same server-side. */
  ownerName?: string
  /** Optional category filter (Phase 2 in the PRD; the interface accepts it
   * now so the adapter doesn't need a re-shape later). */
  category?: DocumentCategory
  /** Top-K cap. Defaults to 25. */
  limit?: number
}

/**
 * The Search adapter contract. The mock implementation does keyword-relevance
 * scoring; a real implementation calls a vector DB + embedding service. To
 * swap, write a new class implementing this interface and update the export
 * in adapters/index.ts.
 */
export interface SearchAdapter {
  /** Mode label surfaced in the UI to set expectations honestly. The mock is
   * "Demo · keyword-relevance"; a real implementation would be "AI semantic". */
  readonly modeLabel: string
  /** Returns ranked results for `query`. Empty/whitespace queries return []. */
  search(query: string, opts?: SmartSearchOpts): Promise<SmartSearchResult[]>
}
