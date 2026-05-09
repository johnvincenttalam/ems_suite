import { flexRender, type ColumnDef, type Table as TanStackTable } from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { cn } from '@/shared/utils/cn'

interface DataTableProps<TData> {
  table: TanStackTable<TData>
  columns: ColumnDef<TData>[]
  /** Icon shown in the empty state. */
  emptyIcon: LucideIcon
  /** Empty-state heading message. */
  emptyMessage: string
  /** Empty-state secondary line. */
  emptyDescription?: string
  /** Fired when a row is clicked. Adds `cursor-pointer` to rows when set.
   * Cells that need their own click handler should call `e.stopPropagation()`
   * on the inner element. */
  onRowClick?: (row: TData) => void
  /** Hide the pagination footer (e.g. when client-side data is small). */
  hidePagination?: boolean
  className?: string
}

/**
 * Standard table shell — rounded card, sticky-header look, hover rows,
 * empty state, pagination footer. Wraps a TanStack `table` instance so
 * each consumer can keep its own column definitions and filter state
 * while sharing the visual treatment.
 *
 * Replaces the inline render block duplicated across 50+ list views.
 */
export function DataTable<TData>({
  table,
  columns,
  emptyIcon,
  emptyMessage,
  emptyDescription,
  onRowClick,
  hidePagination,
  className,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className={cn('bg-white rounded-xl border border-zinc-200/60 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50/50">
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  'border-b border-zinc-100/60 hover:bg-zinc-50/50',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <DataTableEmpty
                colSpan={columns.length}
                icon={emptyIcon}
                message={emptyMessage}
                description={emptyDescription}
              />
            )}
          </tbody>
        </table>
      </div>
      {!hidePagination && <DataTablePagination table={table} />}
    </div>
  )
}
