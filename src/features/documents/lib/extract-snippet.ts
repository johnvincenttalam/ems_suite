/**
 * Snippet extraction shared between Smart Search and the global Search Palette.
 *
 * Strategy: find every char-position where any query token appears in the
 * body, pick the cluster of hits that maximizes distinct-token coverage,
 * trim to whole-word boundaries on each end, and return the snippet (with
 * leading/trailing ellipses where we cropped) plus the match ranges
 * relocated into the snippet's coordinate space so the UI can bold them.
 */

const SNIPPET_RADIUS = 70 // chars on each side of the matched range

export interface ExtractedSnippet {
  /** Trimmed snippet with leading/trailing "…" markers when cropped. Empty
   * string when there's no body or no token hit. */
  snippet: string
  /** Character ranges within `snippet` (start, end exclusive) where a query
   * token was matched. Consumers wrap these in <mark>. */
  matches: Array<[number, number]>
}

export function extractSnippet(body: string, queryTokens: string[]): ExtractedSnippet {
  if (!body || queryTokens.length === 0) return { snippet: '', matches: [] }

  const lowerBody = body.toLowerCase()

  type Hit = { start: number; end: number; token: string }
  const hits: Hit[] = []
  for (const qt of queryTokens) {
    let idx = 0
    while ((idx = lowerBody.indexOf(qt, idx)) !== -1) {
      hits.push({ start: idx, end: idx + qt.length, token: qt })
      idx += qt.length
    }
  }
  if (hits.length === 0) return { snippet: '', matches: [] }

  hits.sort((a, b) => a.start - b.start)
  let best = { start: hits[0].start, end: hits[0].end, distinct: new Set([hits[0].token]) }
  for (let i = 0; i < hits.length; i++) {
    const window = new Set<string>()
    let j = i
    while (j < hits.length && hits[j].start - hits[i].start < SNIPPET_RADIUS * 2) {
      window.add(hits[j].token)
      j++
    }
    if (window.size > best.distinct.size) {
      best = { start: hits[i].start, end: hits[j - 1].end, distinct: window }
    }
  }

  const lo = Math.max(0, best.start - SNIPPET_RADIUS)
  const hi = Math.min(body.length, best.end + SNIPPET_RADIUS)

  // Trim to whole-word boundaries on each end to avoid mid-word cuts.
  let snippetStart = lo
  while (snippetStart > 0 && /\S/.test(body[snippetStart - 1])) snippetStart--
  let snippetEnd = hi
  while (snippetEnd < body.length && /\S/.test(body[snippetEnd])) snippetEnd++

  const snippet =
    (snippetStart > 0 ? '…' : '') +
    body.slice(snippetStart, snippetEnd).trim() +
    (snippetEnd < body.length ? '…' : '')

  // Re-locate match ranges within the snippet (with optional leading "…").
  const offset = (snippetStart > 0 ? 1 : 0) - snippetStart
  const matches: Array<[number, number]> = hits
    .filter((h) => h.start >= snippetStart && h.end <= snippetEnd)
    .map((h): [number, number] => [h.start + offset, h.end + offset])

  return { snippet, matches }
}
