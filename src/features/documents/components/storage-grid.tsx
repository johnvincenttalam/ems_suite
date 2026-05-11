import { Folder, FileText, FileSpreadsheet, FileImage, File, Star } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import type { StorageFolder, StorageItem, DocumentFileType, AppDocument } from '@/features/documents/types'
import { cn } from '@/shared/utils/cn'

interface StorageGridProps {
  folders: StorageFolder[]
  items: StorageItem[]
  /** Map of documentId → AppDocument so reference items can pull the source
   * file type. Pass an empty object if items are upload-only. */
  documentMap: Record<string, AppDocument>
  onFolderClick: (folder: StorageFolder) => void
  onItemClick: (item: StorageItem) => void
  /** Hide the folders section even if `folders` is non-empty (e.g., in the
   * Recent / Starred / Trash virtual views where mixing folders is confusing). */
  hideFolders?: boolean
}

const FILE_ICON: Record<DocumentFileType, { icon: LucideIcon; bg: string; fg: string }> = {
  pdf:  { icon: FileText,        bg: 'bg-red-50',     fg: 'text-red-500' },
  docx: { icon: FileText,        bg: 'bg-blue-50',    fg: 'text-blue-500' },
  xlsx: { icon: FileSpreadsheet, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  png:  { icon: FileImage,       bg: 'bg-violet-50',  fg: 'text-violet-500' },
  jpg:  { icon: FileImage,       bg: 'bg-violet-50',  fg: 'text-violet-500' },
}

function resolveFileType(item: StorageItem, documentMap: Record<string, AppDocument>): DocumentFileType | null {
  if (item.file) return item.file.type
  if (item.documentId) {
    const doc = documentMap[item.documentId]
    return doc?.fileType ?? null
  }
  return null
}

export function StorageGrid({ folders, items, documentMap, onFolderClick, onItemClick, hideFolders }: StorageGridProps) {
  const showFolders = !hideFolders && folders.length > 0

  return (
    <div className="space-y-6">
      {showFolders && (
        <section>
          <h3 className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} onClick={() => onFolderClick(folder)} />
            ))}
          </div>
        </section>
      )}

      <section>
        {showFolders && (
          <h3 className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase mb-2">Files</h3>
        )}
        {items.length === 0 ? null : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                fileType={resolveFileType(item, documentMap)}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FolderCard({ folder, onClick }: { folder: StorageFolder; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-zinc-200/60 hover:border-zinc-300 hover:shadow-sm transition text-left"
    >
      <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
        <Folder className="w-4 h-4 text-amber-500" />
      </div>
      <span className="text-[13px] font-medium text-zinc-700 truncate flex-1">{folder.name}</span>
    </button>
  )
}

function ItemCard({
  item,
  fileType,
  onClick,
}: {
  item: StorageItem
  fileType: DocumentFileType | null
  onClick: () => void
}) {
  const cfg = fileType ? FILE_ICON[fileType] : { icon: File, bg: 'bg-zinc-100', fg: 'text-zinc-400' }
  const Icon = cfg.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-lg bg-white border border-zinc-200/60 hover:border-zinc-300 hover:shadow-sm transition overflow-hidden text-left"
    >
      <div className={cn('aspect-[4/3] flex items-center justify-center relative', cfg.bg)}>
        <Icon className={cn('w-10 h-10', cfg.fg)} />
        {item.starred && (
          <Star className="absolute top-2 right-2 w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        )}
      </div>
      <div className="p-2.5 min-w-0">
        <p className="text-[13px] font-medium text-zinc-800 truncate">{item.title}</p>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[10.5px] text-zinc-400 truncate">
            {format(parseISO(item.createdAt), 'MMM d, yyyy')}
          </span>
          {item.tags.length > 0 && (
            <span className="text-[10.5px] text-zinc-400 truncate">
              {item.tags.slice(0, 2).join(', ')}
              {item.tags.length > 2 && ` +${item.tags.length - 2}`}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
