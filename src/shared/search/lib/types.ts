import type { LucideIcon } from 'lucide-react'

export type SearchEntityType =
  | 'document'
  | 'request'
  | 'work_order'
  | 'inventory_item'
  | 'asset'

export interface GlobalSearchHit {
  /** Stable composite id for keys + dedup. */
  id: string
  type: SearchEntityType
  /** TF-style relevance — higher is better. */
  score: number
  /** Title rendered as the headline; highlights wrap matched tokens. */
  title: string
  /** Optional subtitle shown beneath the title (file name, sender, etc.). */
  subtitle?: string
  /** Tertiary line — usually status/category badges as plain text. */
  meta?: string
  /** Optional ~140-char body excerpt with the matched window. Currently set
   * by document scoring when the query hits the document body — gives users
   * a peek at *why* the doc matched without opening it. The palette renders
   * this with `matches` highlighted; absent for entity types that don't
   * have indexed body text yet. */
  snippet?: string
  /** Character ranges within `snippet` (start, end exclusive) where query
   * tokens were matched. Consumers wrap these in <mark>. */
  matches?: Array<[number, number]>
  /** Per-result entity icon — drives the leading 32px square. */
  icon: LucideIcon
  iconBg: string
  iconColor: string
  /** Intra-app navigation target. */
  link: string
}

export interface ScorerOptions {
  /** Cap each scorer's contribution so any one feature can't drown the others. */
  perScorerLimit?: number
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

/**
 * Run an AND match across tokens. Returns the cumulative score and a
 * `matched` flag. Each token must hit at least one field; otherwise the
 * record is rejected. Score adds the per-field weight on every hit.
 *
 * Used by every per-entity scorer so weighting and AND semantics stay
 * consistent across modules.
 */
export function scoreFields(
  tokens: string[],
  fields: { text: string; weight: number }[],
): { score: number; matched: boolean } {
  let score = 0
  for (const token of tokens) {
    let tokenMatched = false
    for (const f of fields) {
      if (f.text.includes(token)) {
        score += f.weight
        tokenMatched = true
      }
    }
    if (!tokenMatched) return { score: 0, matched: false }
  }
  return { score, matched: true }
}
