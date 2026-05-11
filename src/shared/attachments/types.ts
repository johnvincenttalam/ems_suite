/**
 * A file attached to a domain record (work order, request, PO, …). The actual
 * bytes live in whatever storage backend the active `AttachmentAdapter` uses;
 * this record holds metadata + an adapter-opaque `ref` string.
 *
 * The memory adapter (default in this template) stores `ref` as a blob URL —
 * lost on page reload. A real adapter (S3, Supabase Storage) would set `ref`
 * to the object key and resolve a viewable URL at read time.
 */
export interface Attachment {
  id: string
  name: string
  sizeBytes: number
  mimeType?: string
  uploadedBy: string
  uploadedAt: string
  /** Adapter-specific storage reference. Treat as opaque; resolve via the
   * adapter's `getUrl()` for display. */
  ref: string
}
