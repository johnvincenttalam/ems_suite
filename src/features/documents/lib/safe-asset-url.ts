/**
 * Returns the URL only if it uses an allowed protocol for embedding in
 * <img>/<iframe>/PDF rendering. Rejects javascript:, file:, and other
 * potentially-XSS protocols. Same-origin paths and blob/http(s) URLs pass.
 */
export function safeAssetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  // Same-origin relative path — always safe.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('blob:') || lower.startsWith('http://') || lower.startsWith('https://')) {
    return trimmed
  }
  return undefined
}
