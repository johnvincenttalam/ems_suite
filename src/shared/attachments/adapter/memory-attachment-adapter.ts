import type { Attachment } from '@/shared/attachments/types'
import type { AttachmentAdapter } from './attachment-adapter'

let counter = 0
function nextId(): string {
  counter += 1
  return `ATT-${Date.now().toString(36)}-${counter}`
}

/**
 * In-memory attachment adapter. The file is kept alive only as a blob URL —
 * bytes are not serialised, so a page reload loses the preview. Metadata
 * (name, size, mimeType, uploadedBy, uploadedAt) persists in the owning
 * record (e.g. `WorkOrder.attachments`) just like any other mock state.
 *
 * This is intentionally the template default. Real storage is a one-file
 * adapter swap.
 */
export const memoryAttachmentAdapter: AttachmentAdapter = {
  async upload(file, uploadedBy) {
    const ref = typeof URL !== 'undefined' && URL.createObjectURL
      ? URL.createObjectURL(file)
      : ''
    const attachment: Attachment = {
      id: nextId(),
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || undefined,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      ref,
    }
    return attachment
  },

  getUrl(attachment) {
    return attachment.ref || null
  },

  async remove(attachment) {
    if (attachment.ref && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      try {
        URL.revokeObjectURL(attachment.ref)
      } catch {
        // Already revoked or not a blob URL — fine.
      }
    }
  },
}
