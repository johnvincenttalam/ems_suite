import type { AttachmentAdapter } from './attachment-adapter'
import { memoryAttachmentAdapter } from './memory-attachment-adapter'

/**
 * Active attachment storage adapter. Swap this single export when wiring real
 * storage (S3, Supabase Storage, Azure Blob, …). All callers go through it.
 */
export const attachmentAdapter: AttachmentAdapter = memoryAttachmentAdapter

export type { AttachmentAdapter }
