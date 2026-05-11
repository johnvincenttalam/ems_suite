import { useEffect, useMemo, useState } from 'react'
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
  Tag,
  Folder as FolderIcon,
  Clock,
  HardDrive,
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
import { Button } from '@/shared/ui/button'
import { formatFileSize } from '@/features/documents/components/file-icon'
import { getModulePath } from '@/config/modules'
import { cn } from '@/shared/utils/cn'

const FILE_CONFIG: Record<DocumentFileType, { icon: LucideIcon; bg: string; fg: string; label: string }> = {
  pdf:  { icon: FileText,        bg: 'bg-red-50',     fg: 'text-red-500',     label: 'PDF document' },
  docx: { icon: FileText,        bg: 'bg-blue-50',    fg: 'text-blue-500',    label: 'Word document' },
  xlsx: { icon: FileSpreadsheet, bg: 'bg-emerald-50', fg: 'text-emerald-600', label: 'Spreadsheet' },
  png:  { icon: FileImage,       bg: 'bg-violet-50',  fg: 'text-violet-500',  label: 'Image (PNG)' },
  jpg:  { icon: FileImage,       bg: 'bg-violet-50',  fg: 'text-violet-500',  label: 'Image (JPG)' },
}

interface StoragePreviewDrawerProps {
  open: boolean
  item: StorageItem | null
  onClose: () => void
  onRequestMove?: (item: StorageItem) => void
}

export function StoragePreviewDrawer({ open, item, onClose, onRequestMove }: StoragePreviewDrawerProps) {
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
            <Body item={item} onClose={onClose} onRequestMove={onRequestMove} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

type Tab = 'preview' | 'details' | 'activity'

function Body({
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
  const { data: folders = [] } = useStorageFolders()
  const { data: auditEntries = [] } = useAuditLog()
  const toggleStar = useToggleStorageStar()
  const moveToTrash = useMoveStorageItemToTrash()
  const restoreItem = useRestoreStorageItem()

  const doc: AppDocument | undefined = item.documentId
    ? documents.find((d) => d.id === item.documentId)
    : undefined

  const fileType: DocumentFileType | null = item.file?.type ?? doc?.fileType ?? null
  const fileCfg = fileType ? FILE_CONFIG[fileType] : null
  const FileIconCmp = fileCfg?.icon ?? FileIconGeneric

  const assetUrl = item.file?.assetUrl ?? doc?.assetUrl
  const fileName = item.file?.name ?? doc?.fileName ?? item.title
  const fileSize = item.file?.sizeBytes ?? doc?.fileSizeBytes

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

  const activity = useMemo(() => {
    const idLower = item.id.toLowerCase()
    const titleLower = item.title.toLowerCase()
    return auditEntries
      .filter((e) => {
        const d = e.detail.toLowerCase()
        return d.includes(idLower) || d.includes(titleLower)
      })
      .slice(0, 20)
  }, [auditEntries, item.id, item.title])

  const [tab, setTab] = useState<Tab>('preview')

  const isTrashed = !!item.deletedAt

  return (
    <>
      <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-200">
        <div className="flex items-start gap-3 min-w-0">
          {fileCfg ? (
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', fileCfg.bg)}>
              <FileIconCmp className={cn('w-5 h-5', fileCfg.fg)} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <FileIconGeneric className="w-5 h-5 text-zinc-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-zinc-900 truncate">{item.title}</h2>
              {item.starred && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
            </div>
            <p className="text-[12px] text-zinc-500 truncate mt-0.5">{fileName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 flex-shrink-0 ml-2"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-200 flex-wrap">
        {!isTrashed ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => toggleStar.mutate(item.id)}>
              <Star className={cn('w-3.5 h-3.5', item.starred && 'fill-amber-400 text-amber-400')} />
              {item.starred ? 'Unstar' : 'Star'}
            </Button>
            {onRequestMove && (
              <Button variant="secondary" size="sm" onClick={() => onRequestMove(item)}>
                <FolderInput className="w-3.5 h-3.5" />
                Move…
              </Button>
            )}
            {item.documentId && doc && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(getModulePath('sdms', `documents/${item.documentId}`))}
              >
                <Eye className="w-3.5 h-3.5" />
                Open in SDMS
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
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
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-600">Move to Trash</span>
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              restoreItem.mutate(item.id, {
                onSuccess: () => {
                  toast.success('Restored from trash')
                  onClose()
                },
                onError: (err) =>
                  toast.error('Failed', {
                    description: err instanceof Error ? err.message : 'Unknown error',
                  }),
              })
            }
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore
          </Button>
        )}
      </div>

      <div className="flex border-b border-zinc-200 px-5">
        {(['preview', 'details', 'activity'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2.5 text-[12px] font-medium capitalize border-b-2 -mb-px transition',
              tab === t ? 'border-accent text-accent-fg' : 'border-transparent text-zinc-500 hover:text-zinc-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'preview' && (
          <PreviewPane fileType={fileType} assetUrl={assetUrl} fileName={fileName} />
        )}
        {tab === 'details' && (
          <DetailsPane item={item} doc={doc} folderPath={folderPath} fileSize={fileSize} fileType={fileType} />
        )}
        {tab === 'activity' && <ActivityPane entries={activity} />}
      </div>
    </>
  )
}

function PreviewPane({
  fileType,
  assetUrl,
  fileName,
}: {
  fileType: DocumentFileType | null
  assetUrl: string | undefined
  fileName: string
}) {
  if (!assetUrl) {
    return (
      <div className="p-8 text-center">
        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center mx-auto mb-3">
          <FileIconGeneric className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-[13px] text-zinc-500">No preview available for this item.</p>
      </div>
    )
  }

  if (fileType === 'png' || fileType === 'jpg') {
    return (
      <div className="p-5 flex items-center justify-center bg-zinc-50 min-h-full">
        <img src={assetUrl} alt={fileName} className="max-w-full max-h-[70vh] rounded shadow-sm" />
      </div>
    )
  }

  if (fileType === 'pdf') {
    return (
      <div className="h-full">
        <iframe
          src={assetUrl}
          title={fileName}
          className="w-full h-[70vh] border-0"
        />
      </div>
    )
  }

  return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 rounded-lg bg-zinc-100 flex items-center justify-center mx-auto mb-3">
        <FileIconGeneric className="w-6 h-6 text-zinc-400" />
      </div>
      <p className="text-[13px] text-zinc-700 font-medium mb-1">In-browser preview not supported</p>
      <p className="text-[12px] text-zinc-500 mb-4">
        {fileType?.toUpperCase() ?? 'This file type'} requires the original application.
      </p>
      <a
        href={assetUrl}
        download={fileName}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-[12px] text-zinc-700 hover:bg-zinc-50"
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </a>
    </div>
  )
}

function DetailsPane({
  item,
  doc,
  folderPath,
  fileSize,
  fileType,
}: {
  item: StorageItem
  doc: AppDocument | undefined
  folderPath: StorageFolder[]
  fileSize: number | undefined
  fileType: DocumentFileType | null
}) {
  return (
    <div className="p-5 space-y-4">
      <Section icon={HardDrive} title="Location">
        <Field
          label="Folder"
          value={
            folderPath.length === 0
              ? 'My Storage (root)'
              : ['My Storage', ...folderPath.map((f) => f.name)].join(' › ')
          }
        />
        <Field label="Source" value={item.sourceModule.toUpperCase()} />
        {doc && <Field label="SDMS document" value={`${doc.id} — ${doc.title}`} />}
      </Section>

      <Section icon={FolderIcon} title="File">
        <Field label="File name" value={item.file?.name ?? doc?.fileName ?? '—'} />
        <Field label="Type" value={fileType ? fileType.toUpperCase() : '—'} />
        <Field label="Size" value={fileSize ? formatFileSize(fileSize) : '—'} />
      </Section>

      <Section icon={Tag} title="Notes & tags">
        <Field label="Description" value={item.description || '—'} />
        {item.tags.length > 0 ? (
          <div>
            <p className="text-[10.5px] text-zinc-400 uppercase tracking-wider mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10.5px] font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <Field label="Tags" value="—" />
        )}
      </Section>

      <Section icon={Clock} title="Timestamps">
        <Field label="Created" value={format(parseISO(item.createdAt), 'PPp')} />
        <Field label="Updated" value={format(parseISO(item.updatedAt), 'PPp')} />
        {item.deletedAt && <Field label="Trashed" value={format(parseISO(item.deletedAt), 'PPp')} />}
      </Section>
    </div>
  )
}

function ActivityPane({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13px] text-zinc-500">No activity recorded for this item yet.</p>
      </div>
    )
  }
  return (
    <ul className="p-5 space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="text-[12px] text-zinc-600">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-zinc-800">{e.userId}</span>
            <span className="text-[10.5px] text-zinc-400 whitespace-nowrap">
              {format(parseISO(e.timestamp), 'PP p')}
            </span>
          </div>
          <p className="text-zinc-500 mt-0.5">{e.detail}</p>
        </li>
      ))}
    </ul>
  )
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">
        <Icon className="w-3 h-3" />
        {title}
      </h3>
      <div className="space-y-2 pl-4 border-l border-zinc-100">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-[12.5px] text-zinc-700 mt-0.5 break-words">{value}</p>
    </div>
  )
}
