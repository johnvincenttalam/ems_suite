import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Table } from '@tanstack/react-table'

interface DataTablePaginationProps<T> {
  table: Table<T>
}

export function DataTablePagination<T>({ table }: DataTablePaginationProps<T>) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200/60">
      <p className="text-sm text-zinc-500">
        Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
          className="p-2 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
          className="p-2 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
