/**
 * Build highlight spans by splitting text around case-insensitive token hits.
 * Returns alternating strings — odd-indexed entries should be rendered as
 * `<mark>`; even-indexed plain.
 */
export function highlightSpans(text: string, tokens: string[]): string[] {
  if (tokens.length === 0 || !text) return [text]
  const escaped = tokens
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return [text]
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(re)
}
