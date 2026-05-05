import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Download, Trash2, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, Columns3, ArrowUpDown, ArrowUp, ArrowDown, X,
} from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-header'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Avatar } from '@/shared/ui/avatar'
import { EmptyState } from '@/shared/ui/empty-state'
import { Checkbox } from '@/shared/ui/checkbox'
import { SearchInput } from '@/shared/ui/search-input'
import { exportToCSV } from '@/shared/utils/export-csv'
import { formatCurrency } from '@/shared/utils/format'
import { mockOrders, type Order } from '@/features/orders'
import { cn } from '@/shared/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_OPTIONS = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded'] as const
const REGION_OPTIONS = ['NA', 'EU', 'APAC', 'LATAM'] as const

export function AdvancedTablePage() {
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)

  const columns = useMemo<ColumnDef<Order>[]>(() => [
    {
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={(v) => table.toggleAllPageRowsSelected(v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onChange={(v) => row.toggleSelected(v)} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'reference',
      header: 'Order',
      cell: ({ row }) => (
        <Link to={`/admin/table/${row.original.id}`} className="font-mono text-[13px] font-medium text-zinc-900 hover:text-blue-600">
          {row.original.reference}
        </Link>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.original.customer} size="sm" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 truncate">{row.original.customer}</p>
            <p className="text-[11px] text-zinc-400 truncate">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => <span className="text-[13px] font-medium text-zinc-900">{formatCurrency(getValue() as number)}</span>,
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ getValue }) => <span className="text-[13px] text-zinc-600">{getValue() as number}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} size="sm" />,
      filterFn: 'equals',
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} size="sm" />,
    },
    {
      accessorKey: 'region',
      header: 'Region',
      cell: ({ getValue }) => <span className="text-[13px] text-zinc-600">{getValue() as string}</span>,
      filterFn: 'equals',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => <span className="text-[13px] text-zinc-500">{format(new Date(getValue() as string), 'MMM d, yyyy')}</span>,
    },
  ], [])

  const table = useReactTable({
    data: mockOrders,
    columns,
    state: { globalFilter, columnFilters, sorting, columnVisibility, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const selectedCount = Object.keys(rowSelection).length
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)

  const statusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? ''
  const regionFilter = (columnFilters.find((f) => f.id === 'region')?.value as string) ?? ''

  const setColumnFilter = (id: string, value: string) => {
    setColumnFilters((prev) => {
      const others = prev.filter((f) => f.id !== id)
      if (!value) return others
      return [...others, { id, value }]
    })
  }

  const clearFilters = () => {
    setGlobalFilter('')
    setColumnFilters([])
  }

  const hasFilters = globalFilter !== '' || columnFilters.length > 0

  return (
    <div>
      <PageHeader
        title="Advanced Table"
        subtitle="Sortable, filterable, with row selection and bulk actions"
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              const rows = table.getFilteredRowModel().rows.map((r) => r.original)
              exportToCSV(rows, 'orders', [
                { key: 'reference', label: 'Order' },
                { key: 'customer', label: 'Customer' },
                { key: 'email', label: 'Email' },
                { key: 'amount', label: 'Amount' },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                { key: 'region', label: 'Region' },
                { key: 'createdAt', label: 'Created' },
              ])
            }}
          >
            Export
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Global search */}
            <SearchInput
              value={globalFilter}
              onChange={setGlobalFilter}
              placeholder="Search across all columns..."
              className="flex-1"
            />

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setColumnFilter('status', e.target.value)}
              className="h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Region filter */}
            <select
              value={regionFilter}
              onChange={(e) => setColumnFilter('region', e.target.value)}
              className="h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400"
            >
              <option value="">All regions</option>
              {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            {/* Columns toggle */}
            <div className="relative">
              <Button variant="outline" leftIcon={<Columns3 className="w-4 h-4" />} onClick={() => setColumnsMenuOpen((o) => !o)}>
                Columns
              </Button>
              {columnsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setColumnsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-zinc-200 rounded-lg py-1 z-20">
                    {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => (
                      <button
                        key={column.id}
                        onClick={() => column.toggleVisibility(!column.getIsVisible())}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        <Checkbox checked={column.getIsVisible()} onChange={() => column.toggleVisibility(!column.getIsVisible())} />
                        <span className="capitalize">{column.id.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-zinc-500">
                {table.getFilteredRowModel().rows.length} of {mockOrders.length} rows
              </span>
              <button onClick={clearFilters} className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-900">
                <X className="w-3 h-3" /> Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900 text-white"
          >
            <span className="text-[13px] font-medium">{selectedCount} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => toast.info(`Viewing ${selectedCount} items`)}>
                View
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => {
                exportToCSV(selectedRows, 'selected-orders', [
                  { key: 'reference', label: 'Order' },
                  { key: 'customer', label: 'Customer' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'status', label: 'Status' },
                ])
              }}>
                Export
              </Button>
              <Button size="sm" variant="ghost" className="text-red-300 hover:bg-red-500/20" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => {
                toast.success(`${selectedCount} items deleted`)
                setRowSelection({})
              }}>
                Delete
              </Button>
              <button onClick={() => setRowSelection({})} className="text-white/70 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50/50 border-b border-zinc-100">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider"
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              'flex items-center gap-1.5',
                              header.column.getCanSort() && 'cursor-pointer hover:text-zinc-900'
                            )}
                            disabled={!header.column.getCanSort()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              header.column.getIsSorted() === 'asc' ? <ArrowUp className="w-3 h-3" /> :
                              header.column.getIsSorted() === 'desc' ? <ArrowDown className="w-3 h-3" /> :
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-zinc-100/60 hover:bg-zinc-50/60 transition-colors',
                      row.getIsSelected() && 'bg-blue-50/40'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      <EmptyState title="No results" description="Try adjusting your filters." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-zinc-100">
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-zinc-500">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                {' · '}
                {table.getFilteredRowModel().rows.length} rows
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-8 px-2 text-xs border border-zinc-200 rounded-md bg-white focus:outline-none"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
