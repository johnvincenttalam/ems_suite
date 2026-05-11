import { useMemo, useState } from 'react'
import { ChevronRight, Folder, FolderOpen, HardDrive, Clock, Star, Trash2 } from 'lucide-react'
import type { StorageFolder } from '@/features/documents/types'
import { cn } from '@/shared/utils/cn'

export type StorageSelection =
  | { view: 'folder'; folderId: string | null }
  | { view: 'recent' }
  | { view: 'starred' }
  | { view: 'trash' }

interface FolderTreeProps {
  folders: StorageFolder[]
  selection: StorageSelection
  onSelect: (selection: StorageSelection) => void
  /** Optional counts beside each virtual view. */
  trashCount?: number
  starredCount?: number
}

interface TreeNode {
  folder: StorageFolder
  children: TreeNode[]
}

function buildTree(folders: StorageFolder[]): TreeNode[] {
  const byParent = new Map<string | null, StorageFolder[]>()
  for (const f of folders) {
    const key = f.parentId
    const list = byParent.get(key) ?? []
    list.push(f)
    byParent.set(key, list)
  }

  function build(parentId: string | null): TreeNode[] {
    const children = byParent.get(parentId) ?? []
    return children.map((folder) => ({ folder, children: build(folder.id) }))
  }
  return build(null)
}

function isFolderSelected(sel: StorageSelection, id: string | null): boolean {
  return sel.view === 'folder' && sel.folderId === id
}

export function FolderTree({ folders, selection, onSelect, trashCount, starredCount }: FolderTreeProps) {
  const tree = useMemo(() => buildTree(folders), [folders])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="text-[13px] text-zinc-700 select-none">
      <RootRow
        active={isFolderSelected(selection, null)}
        onClick={() => onSelect({ view: 'folder', folderId: null })}
      />
      <div className="mt-0.5">
        {tree.map((node) => (
          <TreeRow
            key={node.folder.id}
            node={node}
            depth={1}
            expanded={expanded}
            onToggle={toggle}
            selection={selection}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-200/60 space-y-0.5">
        <VirtualRow
          icon={Clock}
          label="Recent"
          active={selection.view === 'recent'}
          onClick={() => onSelect({ view: 'recent' })}
        />
        <VirtualRow
          icon={Star}
          label="Starred"
          count={starredCount}
          active={selection.view === 'starred'}
          onClick={() => onSelect({ view: 'starred' })}
        />
        <VirtualRow
          icon={Trash2}
          label="Trash"
          count={trashCount}
          active={selection.view === 'trash'}
          onClick={() => onSelect({ view: 'trash' })}
        />
      </div>
    </div>
  )
}

function RootRow({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left',
        active ? 'bg-accent/10 text-accent-fg font-medium' : 'hover:bg-zinc-100/80',
      )}
    >
      <HardDrive className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-accent' : 'text-zinc-400')} />
      <span className="truncate">My Storage</span>
    </button>
  )
}

interface TreeRowProps {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  selection: StorageSelection
  onSelect: (s: StorageSelection) => void
}

function TreeRow({ node, depth, expanded, onToggle, selection, onSelect }: TreeRowProps) {
  const isOpen = expanded.has(node.folder.id)
  const hasChildren = node.children.length > 0
  const active = isFolderSelected(selection, node.folder.id)

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect({ view: 'folder', folderId: node.folder.id })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect({ view: 'folder', folderId: node.folder.id })
          }
        }}
        className={cn(
          'flex items-center gap-1 px-1 py-1.5 rounded-md cursor-pointer',
          active ? 'bg-accent/10 text-accent-fg font-medium' : 'hover:bg-zinc-100/80',
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.folder.id)
            }}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-200/60 flex-shrink-0"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className={cn('w-3 h-3 text-zinc-400 transition-transform', isOpen && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}
        {isOpen && hasChildren ? (
          <FolderOpen className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-accent' : 'text-zinc-400')} />
        ) : (
          <Folder className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-accent' : 'text-zinc-400')} />
        )}
        <span className="truncate flex-1">{node.folder.name}</span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selection={selection}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface VirtualRowProps {
  icon: typeof Clock
  label: string
  count?: number
  active: boolean
  onClick: () => void
}

function VirtualRow({ icon: Icon, label, count, active, onClick }: VirtualRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left',
        active ? 'bg-accent/10 text-accent-fg font-medium' : 'hover:bg-zinc-100/80',
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-accent' : 'text-zinc-400')} />
      <span className="truncate flex-1">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-[10.5px] text-zinc-400">{count}</span>
      )}
    </button>
  )
}
