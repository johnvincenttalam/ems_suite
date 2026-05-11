import { useEffect, useMemo, useState } from 'react'
import { Folder, FolderOpen, HardDrive, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useMoveStorageFolder, useStorageFolders } from '@/features/documents/hooks/use-storage'
import type { StorageFolder } from '@/features/documents/types'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

interface MoveStorageFolderModalProps {
  open: boolean
  folder: StorageFolder | null
  onClose: () => void
}

interface FlatRow {
  id: string | null
  name: string
  depth: number
}

function descendantsOf(folders: StorageFolder[], rootId: string): Set<string> {
  const out = new Set<string>([rootId])
  let added = true
  while (added) {
    added = false
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id)
        added = true
      }
    }
  }
  return out
}

function flatten(folders: StorageFolder[], excluded: Set<string>): FlatRow[] {
  const byParent = new Map<string | null, StorageFolder[]>()
  for (const f of folders) {
    if (excluded.has(f.id)) continue
    const list = byParent.get(f.parentId) ?? []
    list.push(f)
    byParent.set(f.parentId, list)
  }

  const out: FlatRow[] = [{ id: null, name: 'Storage (root)', depth: 0 }]

  function walk(parent: string | null, depth: number) {
    const children = (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))
    for (const f of children) {
      out.push({ id: f.id, name: f.name, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 1)
  return out
}

export function MoveStorageFolderModal({ open, folder, onClose }: MoveStorageFolderModalProps) {
  const { data: folders = [] } = useStorageFolders()
  const moveFolder = useMoveStorageFolder()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (open && folder) setSelected(folder.parentId)
  }, [open, folder])

  const rows = useMemo(() => {
    if (!folder) return []
    const excluded = descendantsOf(folders, folder.id)
    return flatten(folders, excluded)
  }, [folders, folder])

  function handleMove() {
    if (!folder) return
    if (selected === folder.parentId) {
      onClose()
      return
    }
    moveFolder.mutate(
      { id: folder.id, newParentId: selected },
      {
        onSuccess: () => {
          toast.success(`Moved "${folder.name}"`)
          onClose()
        },
        onError: (err) =>
          toast.error('Move failed', {
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move folder"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={moveFolder.isPending}>
            Cancel
          </Button>
          <Button onClick={handleMove} loading={moveFolder.isPending} disabled={!folder}>
            Move
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {folder && (
          <p className="text-[12px] text-zinc-500">
            Moving folder <span className="font-medium text-zinc-700">{folder.name}</span>
          </p>
        )}
        <div className="rounded-md border border-zinc-200 max-h-[320px] overflow-y-auto bg-white">
          {rows.map((row) => {
            const isSelected = selected === row.id
            return (
              <button
                key={row.id ?? '__root__'}
                type="button"
                onClick={() => setSelected(row.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 text-left text-[13px] border-b border-zinc-100 last:border-b-0',
                  isSelected ? 'bg-accent/10 text-accent-fg font-medium' : 'hover:bg-zinc-50/60',
                )}
                style={{ paddingLeft: `${8 + row.depth * 16}px` }}
              >
                {row.id === null ? (
                  <HardDrive className={cn('w-3.5 h-3.5 flex-shrink-0', isSelected ? 'text-accent' : 'text-zinc-400')} />
                ) : isSelected ? (
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-accent" />
                ) : (
                  <Folder className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                )}
                <span className="truncate flex-1">{row.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
              </button>
            )
          })}
        </div>
        {rows.length === 1 && folder && (
          <p className="text-[11px] text-zinc-400">
            No other folders to move into — you can only move to root.
          </p>
        )}
      </div>
    </Modal>
  )
}
