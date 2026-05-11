import { useRef, useState } from 'react'
import { Paperclip, Trash2, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { attachmentAdapter } from '@/shared/attachments/adapter'
import type { Attachment } from '@/shared/attachments/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function iconFor(mime?: string) {
  if (!mime) return FileIcon
  if (mime.startsWith('image/')) return ImageIcon
  if (mime === 'application/pdf' || mime.startsWith('text/')) return FileText
  return FileIcon
}

interface AttachmentsPanelProps {
  attachments: Attachment[]
  /** Active user — recorded on each upload. */
  uploadedBy: string
  /** Called when the user picks one or more files. Receives newly-uploaded
   * Attachment metadata; caller persists into its owning record. */
  onAdd: (added: Attachment[]) => void
  /** Called when the user removes an attachment. */
  onRemove: (attachment: Attachment) => void
  /** When true, removes are hidden — read-only view. */
  readOnly?: boolean
  /** Optional empty-state hint. */
  emptyHint?: string
}

export function AttachmentsPanel({
  attachments,
  uploadedBy,
  onAdd,
  onRemove,
  readOnly,
  emptyHint = 'No files attached.',
}: AttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      const uploaded: Attachment[] = []
      for (const f of Array.from(fileList)) {
        uploaded.push(await attachmentAdapter.upload(f, uploadedBy))
      }
      onAdd(uploaded)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12.5px] font-medium text-zinc-700">Attachments</label>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Paperclip className="w-3.5 h-3.5" />}
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              Add files
            </Button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-[12.5px] text-zinc-400 px-3 py-3 bg-zinc-50/70 rounded-lg border border-dashed border-zinc-200">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => {
            const Icon = iconFor(a.mimeType)
            const url = attachmentAdapter.getUrl(a)
            return (
              <li
                key={a.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-200/60 bg-white',
                  'hover:border-zinc-300',
                )}
              >
                <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-zinc-900 hover:text-accent truncate block"
                    >
                      {a.name}
                    </a>
                  ) : (
                    <p className="text-[13px] font-medium text-zinc-900 truncate">{a.name}</p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    {formatBytes(a.sizeBytes)} · {a.uploadedBy} · {format(parseISO(a.uploadedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemove(a)}
                    className="w-7 h-7 inline-flex items-center justify-center text-zinc-400 hover:text-red-600 rounded"
                    aria-label={`Remove ${a.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
