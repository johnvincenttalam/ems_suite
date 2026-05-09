import { useRef, useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import type { User } from '@/features/users/types'
import { UserInfoPopover } from '@/features/users'
import { cn } from '@/shared/utils/cn'

interface ApproverChainEditorProps {
  /** Ordered list of user IDs. Order is meaningful — index 0 signs first. */
  approverIds: string[]
  /** All users used to look up display names; missing users render as the
   * raw ID (defensive — covers deleted users without breaking the chip row). */
  users: User[]
  /** Replaces the entire ordered list. Caller updates its own state. */
  onChange: (next: string[]) => void
  /** Optional callback fired the first time the user reorders, so the parent
   * can mark its draft as "touched" / dirty. */
  onTouch?: () => void
  className?: string
}

/**
 * Editable approver-chain chip row used by the create-document page and the
 * workflow-templates editor. Each chip has:
 *   - a drag handle (mouse) for native HTML5 drag-and-drop reordering
 *   - up / down arrow buttons (keyboard / touch fallback)
 *   - a remove button
 *
 * The component is presentational — it doesn't know about validation rules,
 * just the order. Callers can append new approvers by handing back a longer
 * `approverIds` array.
 */
export function ApproverChainEditor({
  approverIds,
  users,
  onChange,
  onTouch,
  className,
}: ApproverChainEditorProps) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null)

  // Stable ref to the latest array so async drag handlers always see fresh
  // data — React's stale-closure trap bites HTML5 drag events otherwise.
  const idsRef = useRef(approverIds)
  idsRef.current = approverIds

  if (approverIds.length === 0) return null

  const moveApprover = (from: number, to: number) => {
    if (from === to || to < 0 || to >= approverIds.length) return
    const next = [...approverIds]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
    onTouch?.()
  }

  const removeApprover = (idx: number) => {
    onChange(approverIds.filter((_, i) => i !== idx))
    onTouch?.()
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5 p-2 rounded-lg bg-zinc-50 border border-zinc-200/60', className)}>
      {approverIds.map((id, idx) => {
        const u = users.find((x) => x.id === id)
        const isDragging = draggingIdx === idx
        const isDropTarget = dropTargetIdx === idx && draggingIdx !== null && draggingIdx !== idx
        const nameNode = u
          ? (
            <UserInfoPopover user={u}>
              <span className="hover:underline underline-offset-2">{u.name}</span>
            </UserInfoPopover>
          )
          : <span>{id}</span>

        return (
          <span
            key={`${id}-${idx}`}
            draggable
            onDragStart={(e) => {
              setDraggingIdx(idx)
              e.dataTransfer.effectAllowed = 'move'
              // setData is required by Firefox or the drag never starts.
              e.dataTransfer.setData('text/plain', String(idx))
            }}
            onDragEnter={(e) => {
              e.preventDefault()
              if (draggingIdx !== null && draggingIdx !== idx) setDropTargetIdx(idx)
            }}
            onDragOver={(e) => {
              // Browsers reject drops by default; preventDefault declares this
              // chip a valid drop target.
              if (draggingIdx !== null) e.preventDefault()
            }}
            onDragLeave={() => {
              if (dropTargetIdx === idx) setDropTargetIdx(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const from = draggingIdx ?? Number(e.dataTransfer.getData('text/plain'))
              if (Number.isFinite(from) && from !== idx) {
                moveApprover(from, idx)
              }
              setDraggingIdx(null)
              setDropTargetIdx(null)
            }}
            onDragEnd={() => {
              setDraggingIdx(null)
              setDropTargetIdx(null)
            }}
            className={cn(
              'inline-flex items-center gap-1 pl-0.5 pr-1 py-1 rounded-md bg-white border text-[12px] transition-colors',
              isDragging && 'opacity-40',
              isDropTarget ? 'border-zinc-900 ring-1 ring-zinc-900/20' : 'border-zinc-200',
            )}
          >
            <span
              className="px-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
              aria-label={`Drag handle for approver ${idx + 1}`}
            >
              <GripVertical className="w-3 h-3" />
            </span>
            <span className="text-[10px] font-mono text-zinc-400">{idx + 1}.</span>
            {nameNode}
            <button
              type="button"
              onClick={() => moveApprover(idx, idx - 1)}
              disabled={idx === 0}
              className="px-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveApprover(idx, idx + 1)}
              disabled={idx === approverIds.length - 1}
              className="px-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removeApprover(idx)}
              className="px-1 text-zinc-400 hover:text-red-600"
              aria-label="Remove approver"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )
      })}
    </div>
  )
}
