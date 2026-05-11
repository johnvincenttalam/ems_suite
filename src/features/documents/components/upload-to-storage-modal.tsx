import { useCallback, useEffect, useRef, useState } from 'react'
import { UploadCloud, X, File as FileIconGeneric } from 'lucide-react'
import { toast } from 'sonner'
import { useUploadToStorage } from '@/features/documents/hooks/use-storage'
import type { DocumentFileType } from '@/features/documents/types'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { formatFileSize } from '@/features/documents/components/file-icon'
import { cn } from '@/shared/utils/cn'

const EXTENSION_MAP: Record<string, DocumentFileType> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'docx',
  xlsx: 'xlsx',
  xls: 'xlsx',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
}

const ACCEPTED = '.pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg'

function detectType(name: string): DocumentFileType | null {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return null
  return EXTENSION_MAP[ext] ?? null
}

interface UploadToStorageModalProps {
  open: boolean
  onClose: () => void
  /** Folder to upload into. null = root. */
  folderId: string | null
  folderLabel: string
}

export function UploadToStorageModal({ open, onClose, folderId, folderLabel }: UploadToStorageModalProps) {
  const upload = useUploadToStorage()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [dragOver, setDragOver] = useState(false)
  // True once the blob URL has been handed off to a storage item. We must NOT
  // revoke it on close in that case — the item now owns it for the session.
  const transferredRef = useRef(false)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setTitle('')
      setDescription('')
      setTagsRaw('')
      if (previewUrl && !transferredRef.current) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      transferredRef.current = false
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const accept = useCallback((next: File | null) => {
    // Replacing the staged file — the previous blob URL was never transferred,
    // so it's safe to revoke.
    if (previewUrl && !transferredRef.current) URL.revokeObjectURL(previewUrl)
    if (!next) {
      setFile(null)
      setPreviewUrl(null)
      return
    }
    const type = detectType(next.name)
    if (!type) {
      toast.error('Unsupported file type', {
        description: 'Allowed: PDF, DOCX, XLSX, PNG, JPG',
      })
      return
    }
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, ''))
    }
  }, [previewUrl, title])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) accept(f)
  }

  function handleSubmit() {
    if (!file || !previewUrl) return
    const type = detectType(file.name)
    if (!type) return

    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    upload.mutate(
      {
        title: title.trim() || file.name,
        description: description.trim(),
        tags,
        folderId,
        file: {
          name: file.name,
          type,
          sizeBytes: file.size,
          assetUrl: previewUrl,
        },
      },
      {
        onSuccess: () => {
          transferredRef.current = true
          toast.success('File uploaded to storage')
          onClose()
        },
        onError: (err) =>
          toast.error('Upload failed', {
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
      },
    )
  }

  const detectedType = file ? detectType(file.name) : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload to Storage"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={upload.isPending} disabled={!file}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12px] text-zinc-500">Uploading into <span className="font-medium text-zinc-700">{folderLabel}</span></p>

        {!file ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'block rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition',
              dragOver ? 'border-accent bg-accent/5' : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50',
            )}
          >
            <UploadCloud className={cn('w-8 h-8 mx-auto mb-2', dragOver ? 'text-accent' : 'text-zinc-400')} />
            <p className="text-[13px] font-medium text-zinc-700">Drop a file here or click to browse</p>
            <p className="text-[11px] text-zinc-400 mt-1">PDF, DOCX, XLSX, PNG, JPG · stored client-side in Phase 1</p>
            <input
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => accept(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 bg-zinc-50/40">
            <div className="w-10 h-10 rounded-md bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
              <FileIconGeneric className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-zinc-700 truncate">{file.name}</p>
              <p className="text-[11px] text-zinc-400">
                {detectedType?.toUpperCase() ?? '—'} · {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => accept(null)}
              className="text-zinc-400 hover:text-zinc-600 flex-shrink-0"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Display name (defaults to file name)"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
            rows={2}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Tags</label>
          <Input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="Comma-separated (e.g. q2, contract, draft)"
          />
        </div>
      </div>
    </Modal>
  )
}
