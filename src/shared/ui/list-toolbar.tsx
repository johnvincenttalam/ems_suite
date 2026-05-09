import type { ReactNode } from 'react'
import { SearchInput } from '@/shared/ui/search-input'
import { cn } from '@/shared/utils/cn'

interface ListToolbarSearch {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface ListToolbarProps {
  /** Search input slot. Omit if the page doesn't have a search box. */
  search?: ListToolbarSearch
  /** Filter slot, typically `<FilterChips />`. Free-form so callers keep
   * their generic typing on the chips. */
  filter?: ReactNode
  /** Right-side action slot — typically `<ExportMenu />` and a primary
   * `<Button />`. Renders with `gap-2` so consumers don't have to wrap. */
  children?: ReactNode
  /** Bottom margin override. Defaults to `mb-4` matching the existing pages. */
  className?: string
}

/**
 * Standard toolbar above a list/table view: search on the left, optional
 * filter chips next to it, optional action buttons on the right. Replaces
 * the hand-written flex/grid block that was duplicated across 18+ list
 * pages — keeps spacing, breakpoints, and alignment consistent module to
 * module.
 */
export function ListToolbar({ search, filter, children, className }: ListToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row gap-3 sm:items-center justify-between',
        className ?? 'mb-4',
      )}
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1 min-w-0">
        {search && (
          <div className="max-w-sm flex-1">
            <SearchInput
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
            />
          </div>
        )}
        {filter}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}
