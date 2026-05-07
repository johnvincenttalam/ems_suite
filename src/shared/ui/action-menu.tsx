import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

export interface ActionMenuItem {
  /** Stable key for React reconciliation. */
  key: string
  label: string
  icon?: LucideIcon
  onClick: () => void
  /** Renders the item in red. Use for destructive operations. */
  danger?: boolean
  disabled?: boolean
  /** Optional helper text shown below the label, e.g. "promotes to module admin". */
  description?: string
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  className?: string
  triggerLabel?: string
  /** Width in px (default 200). */
  width?: number
}

const MENU_GAP = 4

/**
 * Generic 3-dot dropdown for table row actions. Pass a flat array of items —
 * each renders a button. Empty/falsy items are filtered out so callers can
 * conditionally include actions inline:
 *
 *   <ActionMenu items={[
 *     { key: 'edit', label: 'Edit', icon: Pencil, onClick: ... },
 *     canPromote && { key: 'promote', label: 'Make admin', ... },
 *     { key: 'revoke', label: 'Revoke', ..., danger: true },
 *   ].filter(Boolean) as ActionMenuItem[]} />
 */
export function ActionMenu({ items, className, triggerLabel = 'Row actions', width = 200 }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
        left: Math.max(8, rect.right - width),
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, width])

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

  if (items.length === 0) return null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-label={triggerLabel}
        aria-expanded={open}
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
          className="bg-white rounded-lg border border-zinc-200/60 shadow-lg py-1 z-50"
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  if (!item.disabled) item.onClick()
                }}
                className={cn(
                  'w-full flex items-start gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
                  item.disabled && 'opacity-40 cursor-not-allowed',
                  !item.disabled && (
                    item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  ),
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="block">{item.label}</span>
                  {item.description && (
                    <span className="block text-[11px] text-zinc-400 mt-0.5">{item.description}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
