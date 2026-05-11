import type { Attachment } from '@/shared/attachments/types'

/**
 * Swappable storage layer for attachments. Implementations:
 *  - `memoryAttachmentAdapter` — default; uses `URL.createObjectURL` for an
 *    in-session preview link. Bytes are lost on reload. Good for the template.
 *  - A real adapter (S3, Supabase Storage, etc) would upload bytes, return
 *    the object key as `ref`, and resolve a signed URL in `getUrl`.
 *
 * To swap: replace the export in `adapter/index.ts`. Callers don't change.
 */
export interface AttachmentAdapter {
  /** Upload a file and return the persisted metadata. */
  upload(file: File, uploadedBy: string): Promise<Attachment>
  /** Return a viewable URL for an attachment, or null if previews aren't
   * available in the current adapter. */
  getUrl(attachment: Attachment): string | null
  /** Optional cleanup. Memory adapter revokes the blob URL. */
  remove(attachment: Attachment): Promise<void>
}
