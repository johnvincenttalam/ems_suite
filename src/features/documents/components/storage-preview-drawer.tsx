import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIconGeneric,
  Star,
  Trash2,
  RotateCcw,
  FolderInput,
  Download,
  Eye,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'
import type { StorageItem, StorageFolder, DocumentFileType, AppDocument } from '@/features/documents/types'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import {
  useToggleStorageStar,
  useMoveStorageItemToTrash,
  useRestoreStorageItem,
  useStorageFolders,
} from '@/features/documents/hooks/use-storage'
import { useAuditLog, type AuditEntry } from '@/features/audit-log'
import { safeAssetUrl } from '@/features/documents/lib/safe-asset-url'
import { Tabs } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { formatFileSize } from '@/features/documents/components/file-icon'
import { getModulePath } from '@/config/modules'
import { cn } from '@/shared/utils/cn'

const PdfViewer = lazy(() => import('@/features/documents/components/pdf-viewer'))

const FILE_CONFIG: Record<DocumentFileType, { icon: LucideIcon; bg: string; fg: string }> = {
  pdf:  { icon: FileText,        bg: 'bg-red-50',     fg: 'text-red-500' },
  docx: { icon: FileText,        bg: 'bg-blue-50',    fg: 'text-blue-500' },
  xlsx: { icon: FileSpreadsheet, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  png:  { icon: FileImage,       bg: 'bg-violet-50',  fg: 'text-violet-500' },
  jpg:  { icon: FileImage,       bg: 'bg-violet-50',  fg: 'text-violet-500' },
}

interface StoragePreviewDrawerProps {
  open: boolean
  item: StorageItem | null
  onClose: () => void
  onRequestMove?: (item: StorageItem) => void
}

type DrawerTab = 'preview' | 'details' | 'activity'

export function StoragePreviewDrawer({ open, item, onClose, onRequestMove }: StoragePreviewDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('preview')

  useEffect(() => {
    if (open) setTab('preview')
  }, [open, item?.id])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const tabs: { label: string; value: DrawerTab }[] = [
    { label: 'Preview', value: 'preview' },
    { label: 'Details', value: 'details' },
    { label: 'Activity', value: 'activity' },
  ]

  return (
    <AnimatePresence>
      {open && item && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] as const }}
            className="absolute top-0 right-0 h-full w-full sm:w-[640px] bg-white shadow-xl border-l border-zinc-200 flex flex-col"
          >
            <DrawerHeader item={item} onClose={onClose} onRequestMove={onRequestMove} />

            <div className="px-6 pt-3 border-b border-zinc-100">
              <Tabs items={tabs} value={tab} onChange={(v) => setTab(v as DrawerTab)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'preview' && <PreviewTab item={item} />}
              {tab === 'details' && <DetailsTab item={item} />}
              {tab === 'activity' && <ActivityTab item={item} />}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function DrawerHeader({
  item,
  onClose,
  onRequestMove,
}: {
  item: StorageItem
  onClose: () => void
  onRequestMove?: (item: StorageItem) => void
}) {
  const navigate = useNavigate()
  const { data: documents = [] } = useDocuments()
  const toggleStar = useToggleStorageStar()
  const moveToTrash = useMoveStorageItemToTrash()
  const restoreItem = useRestoreStorageItem()

  const doc: AppDocument | undefined = item.documentId
    ? documents.find((d) => d.id === item.documentId)
    : undefined
  const fileType: DocumentFileType | null = item.file?.type ?? doc?.fileType ?? null
  const fileCfg = fileType ? FILE_CONFIG[fileType] : null
  const FileIconCmp = fileCfg?.icon ?? FileIconGeneric
  const fileName = item.file?.name ?? doc?.fileName ?? item.title

  const isTrashed = !!item.deletedAt

  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-100">
      <div className="flex items-start gap-4 min-w-0">
        <div
          className={cn(
            'w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0',
            fileCfg ? fileCfg.bg : 'bg-zinc-100',
          )}
        >
          <FileIconCmp className={cn('w-6 h-6', fileCfg?.fg ?? 'text-zinc-400')} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-zinc-400">{item.id}</span>
            {isTrashed ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border bg-zinc-50 text-zinc-600 border-zinc-200 text-[10.5px] font-medium">
                In Trash
              </span>
            ) : item.starred ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 text-[10.5px] font-medium">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                Starred
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] font-medium">
                {item.sourceModule.toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold text-zinc-900 leading-snug truncate mt-0.5">
            {item.title}
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{fileName}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isTrashed ? (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() =>
              restoreItem.mutate(item.id, {
                onSuccess: () => {
                  toast.success('Restored from trash')
                  onClose()
                },
                onError: (err) =>
                  toast.error('Restore failed', {
                    description: err instanceof Error ? err.message : 'Unknown error',
                  }),
              })
            }
          >
            Restore
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Star className={cn('w-3.5 h-3.5', item.starred && 'fill-amber-400 text-amber-400')} />}
              onClick={() => toggleStar.mutate(item.id)}
            >
              {item.starred ? 'Unstar' : 'Star'}
            </Button>
            {onRequestMove && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<FolderInput className="w-3.5 h-3.5" />}
                onClick={() => onRequestMove(item)}
              >
                Move
              </Button>
            )}
            {item.documentId && doc && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => navigate(getModulePath('sdms', `documents/${item.documentId}`))}
              >
                Open
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() =>
                moveToTrash.mutate(item.id, {
                  onSuccess: () => {
                    toast.success('Moved to trash')
                    onClose()
                  },
                  onError: (err) =>
                    toast.error('Failed', {
                      description: err instanceof Error ? err.message : 'Unknown error',
                    }),
                })
              }
            >
              Trash
            </Button>
          </>
        )}
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function buildPreviewDoc(item: StorageItem, doc: AppDocument | undefined): AppDocument | null {
  if (doc) return doc
  if (item.file) {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      fileName: item.file.name,
      fileType: item.file.type,
      fileSizeBytes: item.file.sizeBytes,
      status: 'draft',
      version: 1,
      approvers: [],
      signatures: [],
      signatureSlots: [],
      createdBy: item.ownerName,
      createdAt: item.createdAt,
      assetUrl: item.file.assetUrl,
    }
  }
  return null
}

function PreviewTab({ item }: { item: StorageItem }) {
  const { data: documents = [] } = useDocuments()
  const [fullscreen, setFullscreen] = useState(false)
  const doc = item.documentId ? documents.find((d) => d.id === item.documentId) : undefined
  const previewDoc = buildPreviewDoc(item, doc)
  const fileType: DocumentFileType | null = previewDoc?.fileType ?? null
  const assetUrl = safeAssetUrl(previewDoc?.assetUrl)
  const fileName = previewDoc?.fileName ?? item.title

  const canRender =
    !!assetUrl && (fileType === 'pdf' || fileType === 'png' || fileType === 'jpg')

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold truncate">{fileName}</p>
        {canRender && (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/80"
            aria-label="Open fullscreen preview"
          >
            <Maximize2 className="w-3 h-3" />
            Fullscreen
          </button>
        )}
      </div>
      <PreviewContent doc={previewDoc} assetUrl={assetUrl} fileType={fileType} fileName={fileName} compact />

      <FullscreenPreview
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        doc={previewDoc}
        assetUrl={assetUrl}
        fileType={fileType}
        fileName={fileName}
      />
    </>
  )
}

interface PreviewContentProps {
  doc: AppDocument | null
  assetUrl: string | undefined
  fileType: DocumentFileType | null
  fileName: string
  /** When true, caps height to fit the drawer body. When false, fills the container. */
  compact?: boolean
}

function PreviewContent({ doc, assetUrl, fileType, fileName, compact }: PreviewContentProps) {
  if (!assetUrl) {
    return (
      <EmptyPreview
        title="No preview available"
        message="The source file isn't attached or its URL is unreachable. Use Details to confirm where the file lives."
      />
    )
  }

  if (fileType === 'png' || fileType === 'jpg') {
    return (
      <div className={cn('flex items-center justify-center rounded-lg border border-zinc-200/60 bg-zinc-100/50 p-4', compact ? 'min-h-[300px]' : 'min-h-0 flex-1')}>
        <img
          src={assetUrl}
          alt={fileName}
          className={cn('rounded shadow-sm select-none', compact ? 'max-w-full max-h-[60vh]' : 'max-w-full max-h-full')}
          draggable={false}
        />
      </div>
    )
  }

  if (fileType === 'pdf' && doc) {
    return (
      <Suspense
        fallback={
          <div className={cn('rounded-lg border border-zinc-200/60 bg-zinc-50/50 flex items-center justify-center', compact ? 'min-h-[480px]' : 'min-h-0 flex-1')}>
            <Spinner size="lg" />
          </div>
        }
      >
        <PdfViewer doc={doc} url={assetUrl} userMap={{}} />
      </Suspense>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/50 min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-3 shadow-sm">
        <FileIconGeneric className="w-7 h-7 text-zinc-400" />
      </div>
      <p className="text-[13px] font-medium text-zinc-900">{fileName}</p>
      <p className="text-[12px] text-zinc-500 mt-1">
        {fileType ? `${fileType.toUpperCase()} · ` : ''}In-browser preview not supported.
      </p>
      <a
        href={assetUrl}
        download={fileName}
        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50"
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </a>
    </div>
  )
}

interface FullscreenPreviewProps {
  open: boolean
  onClose: () => void
  doc: AppDocument | null
  assetUrl: string | undefined
  fileType: DocumentFileType | null
  fileName: string
}

function FullscreenPreview({ open, onClose, doc, assetUrl, fileType, fileName }: FullscreenPreviewProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-zinc-900/85 backdrop-blur-sm flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 text-white">
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{fileName}</p>
              <p className="text-[11px] text-white/60 mt-0.5">
                {fileType ? fileType.toUpperCase() : 'File'} · Fullscreen preview
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-[12px] hover:bg-white/20"
              aria-label="Exit fullscreen"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              <PreviewContent doc={doc} assetUrl={assetUrl} fileType={fileType} fileName={fileName} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DetailsTab({ item }: { item: StorageItem }) {
  const { data: documents = [] } = useDocuments()
  const { data: folders = [] } = useStorageFolders()
  const doc = item.documentId ? documents.find((d) => d.id === item.documentId) : undefined
  const fileType: DocumentFileType | null = item.file?.type ?? doc?.fileType ?? null
  const fileSize = item.file?.sizeBytes ?? doc?.fileSizeBytes
  const fileName = item.file?.name ?? doc?.fileName

  const folderPath = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]))
    const path: StorageFolder[] = []
    let cursor = item.folderId
    while (cursor) {
      const f = byId.get(cursor)
      if (!f) break
      path.unshift(f)
      cursor = f.parentId
    }
    return path
  }, [folders, item.folderId])

  const location =
    folderPath.length === 0 ? 'Storage (root)' : ['Storage', ...folderPath.map((f) => f.name)].join(' › ')

  return (
    <div className="space-y-6">
      <Section title="Location">
        <Grid>
          <Field label="Folder">{location}</Field>
          <Field label="Source">{item.sourceModule.toUpperCase()}</Field>
          {doc && (
            <Field label="SDMS Document">
              <span className="font-mono">{doc.id}</span> — {doc.title}
            </Field>
          )}
        </Grid>
      </Section>

      <Section title="File">
        <Grid>
          <Field label="File Name">{fileName ?? '—'}</Field>
          <Field label="Type">{fileType ? fileType.toUpperCase() : '—'}</Field>
          <Field label="Size">{fileSize ? formatFileSize(fileSize) : '—'}</Field>
        </Grid>
      </Section>

      <Section title="Notes & Tags">
        <Field label="Description">{item.description || '—'}</Field>
        {item.tags.length > 0 && (
          <div className="mt-3">
            <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10.5px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Timestamps">
        <Grid>
          <Field label="Created">{format(parseISO(item.createdAt), 'MMM d, yyyy HH:mm')}</Field>
          <Field label="Updated">{format(parseISO(item.updatedAt), 'MMM d, yyyy HH:mm')}</Field>
          {item.deletedAt && (
            <Field label="Trashed">{format(parseISO(item.deletedAt), 'MMM d, yyyy HH:mm')}</Field>
          )}
        </Grid>
      </Section>
    </div>
  )
}

function ActivityTab({ item }: { item: StorageItem }) {
  const { data: auditEntries = [] } = useAuditLog()
  const entries = useMemo(() => {
    const idLower = item.id.toLowerCase()
    const titleLower = item.title.toLowerCase()
    return auditEntries
      .filter((e) => {
        const d = e.detail.toLowerCase()
        return d.includes(idLower) || d.includes(titleLower)
      })
      .slice(0, 20)
  }, [auditEntries, item.id, item.title])

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-zinc-500">No activity recorded for this item yet.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry: AuditEntry) => (
        <li key={entry.id} className="rounded-lg border border-zinc-200/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] text-zinc-700">{entry.detail}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {entry.userName} · {format(parseISO(entry.timestamp), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <span className="text-[10.5px] uppercase tracking-wider text-zinc-400">{entry.action}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmptyPreview({ title, message }: { title: string; message: string }) {
  return (
    <div className="py-12 text-center">
      <FileIconGeneric className="w-7 h-7 text-zinc-300 mx-auto mb-3" />
      <p className="text-[14px] font-medium text-zinc-700">{title}</p>
      <p className="text-[12.5px] text-zinc-500 mt-1 max-w-sm mx-auto">{message}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold mb-0.5">{label}</p>
      <div className="text-[13px] text-zinc-800 break-words">{children}</div>
    </div>
  )
}
