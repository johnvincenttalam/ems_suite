import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { toast } from 'sonner'

interface RowActionsProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

const MENU_WIDTH = 144 // w-36
const MENU_GAP = 4

export function RowActions({ onView, onEdit, onDelete, className }: RowActionsProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Measure and position the menu when it opens, and track scroll/resize.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return

    function update() {
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const menuHeight = menuRef.current?.offsetHeight ?? 0
      const spaceBelow = window.innerHeight - rect.bottom
      const flipUp = menuHeight > 0 && spaceBelow < menuHeight + MENU_GAP

      setPos({
        top: flipUp ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP,
        left: Math.max(8, rect.right - MENU_WIDTH),
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  // Close on outside click — accept clicks on both the trigger and the portal menu as "inside".
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const handleDelete = () => {
    setOpen(false)
    toast('Item deleted', { description: 'This action would delete the record.' })
    onDelete?.()
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Row actions"
        aria-expanded={open}
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="bg-white rounded-lg border border-zinc-200/60 py-1 z-50"
        >
          {onView && (
            <button
              onClick={() => { setOpen(false); onView() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
