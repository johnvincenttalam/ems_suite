import { useEffect, useMemo, useState } from 'react'
import { Folder, FolderOpen, HardDrive, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useMoveStorageItem, useStorageFolders } from '@/features/documents/hooks/use-storage'
import type { StorageItem, StorageFolder } from '@/features/documents/types'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

interface MoveStorageItemModalProps {
  open: boolean
  item: StorageItem | null
  onClose: () => void
}

interface FlatRow {
  id: string | null
  name: string
  depth: number
  parentChain: string[]
}

function flatten(folders: StorageFolder[]): FlatRow[] {
  const byParent = new Map<string | null, StorageFolder[]>()
  for (const f of folders) {
    const list = byParent.get(f.parentId) ?? []
    list.push(f)
    byParent.set(f.parentId, list)
  }

  const out: FlatRow[] = [{ id: null, name: 'My Storage (root)', depth: 0, parentChain: [] }]

  function walk(parent: string | null, depth: number, chain: string[]) {
    const children = (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))
    for (const f of children) {
      out.push({ id: f.id, name: f.name, depth, parentChain: chain })
      walk(f.id, depth + 1, [...chain, f.id])
    }
  }
  walk(null, 1, [])
  return out
}

export function MoveStorageItemModal({ open, item, onClose }: MoveStorageItemModalProps) {
  const { data: folders = [] } = useStorageFolders()
  const moveItem = useMoveStorageItem()
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (open && item) setSelected(item.folderId)
  }, [open, item])

  const rows = useMemo(() => flatten(folders), [folders])

  function handleMove() {
    if (!item) return
    if (selected === item.folderId) {
      onClose()
      return
    }
    moveItem.mutate(
      { id: item.id, newFolderId: selected },
      {
        onSuccess: () => {
          toast.success('Moved')
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
      title="Move to folder"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={moveItem.isPending}>
            Cancel
          </Button>
          <Button onClick={handleMove} loading={moveItem.isPending} disabled={!item}>
            Move
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {item && (
          <p className="text-[12px] text-zinc-500">
            Moving <span className="font-medium text-zinc-700">{item.title}</span>
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
      </div>
    </Modal>
  )
}
