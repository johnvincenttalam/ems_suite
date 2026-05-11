import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bookmark,
  Eye,
  Trash2,
  AlertTriangle,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Star,
  RotateCcw,
  UploadCloud,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useReactTable, getCoreRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import {
  useMyStorage,
  useStorageFolders,
  useCreateStorageFolder,
  useMoveStorageItemToTrash,
  useRestoreStorageItem,
  useEmptyStorageTrash,
  useToggleStorageStar,
} from '@/features/documents/hooks/use-storage'
import { type StorageSort } from '@/features/documents/api/storage-api'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useAuthStore } from '@/features/auth'
import type { StorageItem, StorageFolder } from '@/features/documents/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { getModulePath } from '@/config/modules'
import { cn } from '@/shared/utils/cn'
import { FolderTree, type StorageSelection } from '@/features/documents/components/folder-tree'
import { StorageGrid } from '@/features/documents/components/storage-grid'
import { StoragePreviewDrawer } from '@/features/documents/components/storage-preview-drawer'
import { UploadToStorageModal } from '@/features/documents/components/upload-to-storage-modal'

const SORT_OPTIONS: { value: StorageSort; label: string }[] = [
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'date_asc',   label: 'Oldest first' },
  { value: 'title_asc',  label: 'Title A → Z' },
  { value: 'title_desc', label: 'Title Z → A' },
]

const SOURCE_LABEL: Record<StorageItem['sourceModule'], string> = {
  sdms: 'SDMS',
}

function buildFolderPath(folders: StorageFolder[], folderId: string | null): StorageFolder[] {
  const path: StorageFolder[] = []
  let current = folderId
  const byId = new Map(folders.map((f) => [f.id, f]))
  while (current !== null) {
    const f = byId.get(current)
    if (!f) break
    path.unshift(f)
    current = f.parentId
  }
  return path
}

export function SdmsStoragePage() {
  const currentUser = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const [selection, setSelection] = useState<StorageSelection>({ view: 'folder', folderId: null })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<StorageSort>('date_desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: folders = [] } = useStorageFolders()
  const { data: items = [], isLoading } = useMyStorage({
    view: selection.view,
    folderId: selection.view === 'folder' ? selection.folderId : undefined,
    search,
    sort,
    recentLimit: 50,
  })
  const { data: documents = [] } = useDocuments()
  const { data: trashItems = [] } = useMyStorage({ view: 'trash' })
  const { data: starredItems = [] } = useMyStorage({ view: 'starred' })

  const docMap = useMemo(() => Object.fromEntries(documents.map((d) => [d.id, d])), [documents])

  const childFolders = useMemo(() => {
    if (selection.view !== 'folder') return []
    return folders.filter((f) => f.parentId === selection.folderId)
  }, [folders, selection])

  const breadcrumbPath = useMemo(() => {
    if (selection.view !== 'folder') return []
    return buildFolderPath(folders, selection.folderId)
  }, [folders, selection])

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const createFolder = useCreateStorageFolder()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null)

  const [trashTarget, setTrashTarget] = useState<StorageItem | null>(null)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const moveToTrash = useMoveStorageItemToTrash()
  const restoreItem = useRestoreStorageItem()
  const emptyTrash = useEmptyStorageTrash()
  const toggleStar = useToggleStorageStar()

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    const parentId = selection.view === 'folder' ? selection.folderId : null
    createFolder.mutate(
      { name: newFolderName.trim(), parentId },
      {
        onSuccess: (folder) => {
          toast.success(`Folder "${folder.name}" created`)
          setNewFolderOpen(false)
          setNewFolderName('')
        },
        onError: (err) =>
          toast.error('Could not create folder', {
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
      },
    )
  }

  const columns = useMemo<ColumnDef<StorageItem>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const item = row.original
        const doc = item.documentId ? docMap[item.documentId] : undefined
        const unavailable = !doc && !item.file
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {item.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />}
              <p className="font-medium text-zinc-900 truncate">{item.title}</p>
              {unavailable && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Unavailable
                </span>
              )}
            </div>
            {row.original.description && (
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{row.original.description}</p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags
        if (tags.length === 0) return <span className="text-zinc-400 text-[12px]">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10.5px] font-medium">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10.5px] text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'sourceModule',
      header: 'Source',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] font-medium">
          {SOURCE_LABEL[getValue() as StorageItem['sourceModule']]}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Stored',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-zinc-500 whitespace-nowrap">
          {format(parseISO(getValue() as string), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        const doc = item.documentId ? docMap[item.documentId] : undefined
        const isTrash = selection.view === 'trash'

        const menuItems: ActionMenuItem[] = isTrash
          ? [
              {
                key: 'restore',
                label: 'Restore',
                icon: RotateCcw,
                onClick: () =>
                  restoreItem.mutate(item.id, {
                    onSuccess: () => toast.success('Restored from trash'),
                    onError: (err) =>
                      toast.error('Restore failed', {
                        description: err instanceof Error ? err.message : 'Unknown error',
                      }),
                  }),
              },
            ]
          : [
              ...(doc && item.documentId
                ? [{
                    key: 'view',
                    label: 'View document',
                    icon: Eye,
                    onClick: () => navigate(getModulePath('sdms', `documents/${item.documentId}`)),
                  }]
                : []),
              {
                key: 'star',
                label: item.starred ? 'Unstar' : 'Star',
                icon: Star,
                onClick: () => toggleStar.mutate(item.id),
              },
              {
                key: 'trash',
                label: 'Move to Trash',
                icon: Trash2,
                danger: true,
                onClick: () => setTrashTarget(item),
              },
            ]
        return (
          <div className="flex justify-end">
            <ActionMenu items={menuItems} />
          </div>
        )
      },
    },
  ], [docMap, navigate, selection.view, restoreItem, toggleStar])

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  function handleItemClick(item: StorageItem) {
    setPreviewItem(item)
  }

  const headerTitle =
    selection.view === 'recent' ? 'Recent' :
    selection.view === 'starred' ? 'Starred' :
    selection.view === 'trash' ? 'Trash' :
    breadcrumbPath.length > 0 ? breadcrumbPath[breadcrumbPath.length - 1].name :
    'My Storage'

  return (
    <div>
      <PageHeader
        title="My Storage"
        subtitle="Your document vault — bookmark SDMS references and organize them into folders."
        actions={
          <>
            <Button variant="secondary" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="w-3.5 h-3.5" />
              New folder
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <UploadCloud className="w-3.5 h-3.5" />
              Upload
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <FolderTree
            folders={folders}
            selection={selection}
            onSelect={(s) => setSelection(s)}
            trashCount={trashItems.length}
            starredCount={starredItems.length}
          />
        </aside>

        <div className="min-w-0">
          <StorageBreadcrumb
            selection={selection}
            path={breadcrumbPath}
            onNavigate={(s) => setSelection(s)}
          />

          <ListToolbar
            search={{ value: search, onChange: setSearch, placeholder: 'Search title, description, tags…' }}
          >
            <div className="flex items-center gap-2">
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <div className="min-w-[150px]">
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as StorageSort)}
                  options={SORT_OPTIONS}
                />
              </div>
              {selection.view === 'trash' && trashItems.length > 0 && (
                <Button variant="danger" onClick={() => setEmptyTrashOpen(true)}>
                  Empty Trash
                </Button>
              )}
            </div>
          </ListToolbar>

          {isLoading ? (
            <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
              <TableSkeleton columns={5} rows={6} />
            </div>
          ) : viewMode === 'grid' ? (
            childFolders.length === 0 && items.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title={headerTitle === 'My Storage' ? 'Your storage is empty' : `Nothing in ${headerTitle}`}
                description={
                  search
                    ? 'No items match your search.'
                    : selection.view === 'trash'
                    ? 'Items you move to trash will appear here.'
                    : 'Open any document and click Add to Storage to bookmark it.'
                }
              />
            ) : (
              <StorageGrid
                folders={childFolders}
                items={items}
                documentMap={docMap}
                onFolderClick={(f) => setSelection({ view: 'folder', folderId: f.id })}
                onItemClick={handleItemClick}
                hideFolders={selection.view !== 'folder'}
              />
            )
          ) : (
            <DataTable
              table={table}
              columns={columns}
              emptyIcon={Bookmark}
              emptyMessage={
                search
                  ? 'No items match your search'
                  : selection.view === 'trash'
                  ? 'Trash is empty'
                  : 'Your storage is empty — open any document and click Add to Storage to bookmark it.'
              }
              onRowClick={handleItemClick}
            />
          )}
        </div>
      </div>

      <Modal
        open={newFolderOpen}
        onClose={() => {
          setNewFolderOpen(false)
          setNewFolderName('')
        }}
        title="New folder"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setNewFolderOpen(false)
                setNewFolderName('')
              }}
              disabled={createFolder.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder as unknown as () => void}
              loading={createFolder.isPending}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateFolder} className="space-y-2">
          <p className="text-[12px] text-zinc-500">
            {selection.view === 'folder' && breadcrumbPath.length > 0
              ? `Inside ${breadcrumbPath[breadcrumbPath.length - 1].name}`
              : 'At the root of My Storage'}
          </p>
          <Input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
          />
        </form>
      </Modal>

      <Modal
        open={!!trashTarget}
        onClose={() => setTrashTarget(null)}
        title="Move to Trash?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTrashTarget(null)} disabled={moveToTrash.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={moveToTrash.isPending}
              onClick={() => trashTarget && moveToTrash.mutate(trashTarget.id, {
                onSuccess: () => {
                  toast.success('Moved to trash', {
                    description: 'You can restore it from the Trash view.',
                  })
                  setTrashTarget(null)
                },
                onError: (err) => toast.error('Failed', {
                  description: err instanceof Error ? err.message : 'Unknown error',
                }),
              })}
            >
              Move to Trash
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-zinc-500">
          <span className="font-medium text-zinc-700">{trashTarget?.title}</span> will be moved to the Trash
          view. The source document is unaffected.
        </p>
      </Modal>

      <Modal
        open={emptyTrashOpen}
        onClose={() => setEmptyTrashOpen(false)}
        title="Empty Trash?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmptyTrashOpen(false)} disabled={emptyTrash.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={emptyTrash.isPending}
              onClick={() => emptyTrash.mutate(undefined, {
                onSuccess: (removed) => {
                  toast.success(`Emptied trash`, { description: `${removed} item${removed === 1 ? '' : 's'} permanently deleted.` })
                  setEmptyTrashOpen(false)
                },
                onError: (err) => toast.error('Failed', {
                  description: err instanceof Error ? err.message : 'Unknown error',
                }),
              })}
            >
              Empty Trash
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-zinc-500">
          {trashItems.length} item{trashItems.length === 1 ? '' : 's'} will be permanently deleted. This cannot be undone.
        </p>
      </Modal>

      <UploadToStorageModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folderId={selection.view === 'folder' ? selection.folderId : null}
        folderLabel={
          selection.view === 'folder' && breadcrumbPath.length > 0
            ? breadcrumbPath[breadcrumbPath.length - 1].name
            : 'My Storage'
        }
      />

      <StoragePreviewDrawer
        open={!!previewItem}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {currentUser ? null : null}
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: 'grid' | 'list'; onChange: (v: 'grid' | 'list') => void }) {
  return (
    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded',
          value === 'grid' ? 'bg-zinc-100 text-zinc-700' : 'text-zinc-400 hover:text-zinc-600',
        )}
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded',
          value === 'list' ? 'bg-zinc-100 text-zinc-700' : 'text-zinc-400 hover:text-zinc-600',
        )}
        aria-label="List view"
        aria-pressed={value === 'list'}
      >
        <ListIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface StorageBreadcrumbProps {
  selection: StorageSelection
  path: StorageFolder[]
  onNavigate: (s: StorageSelection) => void
}

function StorageBreadcrumb({ selection, path, onNavigate }: StorageBreadcrumbProps) {
  return (
    <nav aria-label="Storage breadcrumb" className="flex items-center gap-1 text-[12px] mb-4 flex-wrap">
      <button
        type="button"
        onClick={() => onNavigate({ view: 'folder', folderId: null })}
        className="text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        My Storage
      </button>
      {selection.view === 'folder' && path.map((folder, i) => {
        const isLast = i === path.length - 1
        return (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-zinc-300" />
            {isLast ? (
              <span className="text-zinc-700 font-medium">{folder.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate({ view: 'folder', folderId: folder.id })}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {folder.name}
              </button>
            )}
          </span>
        )
      })}
      {selection.view !== 'folder' && (
        <span className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-zinc-300" />
          <span className="text-zinc-700 font-medium capitalize">{selection.view}</span>
        </span>
      )}
    </nav>
  )
}
