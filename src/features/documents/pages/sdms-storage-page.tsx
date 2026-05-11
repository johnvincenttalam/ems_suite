import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bookmark,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMyStorage } from '@/features/documents/hooks/use-storage'
import { storageApi, type StorageSort } from '@/features/documents/api/storage-api'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useAuthStore } from '@/features/auth'
import type { StorageItem } from '@/features/documents/types'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { getModulePath } from '@/config/modules'

const SORT_OPTIONS: { value: StorageSort; label: string }[] = [
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'date_asc',   label: 'Oldest first' },
  { value: 'title_asc',  label: 'Title A → Z' },
  { value: 'title_desc', label: 'Title Z → A' },
]

const SOURCE_LABEL: Record<StorageItem['sourceModule'], string> = {
  sdms: 'SDMS',
}

export function SdmsStoragePage() {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<StorageSort>('date_desc')

  const { data: items = [], isLoading } = useMyStorage({ search, sort })
  const { data: documents = [] } = useDocuments()
  const docMap = useMemo(() => Object.fromEntries(documents.map((d) => [d.id, d])), [documents])

  const [removeTarget, setRemoveTarget] = useState<StorageItem | null>(null)

  const removeMutation = useMutation({
    mutationFn: (item: StorageItem) => {
      if (!currentUser) throw new Error('Not signed in')
      return storageApi.remove(item.id, currentUser.name)
    },
    onSuccess: () => {
      toast.success('Removed from Storage')
      setRemoveTarget(null)
      queryClient.invalidateQueries({ queryKey: ['storage'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
    onError: (err) => toast.error('Remove failed', {
      description: err instanceof Error ? err.message : 'Unknown error',
    }),
  })

  const columns = useMemo<ColumnDef<StorageItem>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const doc = row.original.documentId ? docMap[row.original.documentId] : undefined
        const unavailable = !doc && !row.original.file
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-zinc-900 truncate">{row.original.title}</p>
              {unavailable && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-medium">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Unavailable
                </span>
              )}
            </div>
            {row.original.description && (
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{row.original.description}</p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags
        if (tags.length === 0) return <span className="text-zinc-400 text-[12px]">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10.5px] font-medium">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10.5px] text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'sourceModule',
      header: 'Source',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] font-medium">
          {SOURCE_LABEL[getValue() as StorageItem['sourceModule']]}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Stored',
      cell: ({ getValue }) => (
        <span className="text-[12px] text-zinc-500 whitespace-nowrap">
          {format(parseISO(getValue() as string), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        const doc = item.documentId ? docMap[item.documentId] : undefined
        const menuItems: ActionMenuItem[] = [
          ...(doc && item.documentId ? [{
            key: 'view',
            label: 'View document',
            icon: Eye,
            onClick: () => navigate(getModulePath('sdms', `documents/${item.documentId}`)),
          }] : []),
          {
            key: 'remove',
            label: 'Remove from Storage',
            icon: Trash2,
            danger: true,
            onClick: () => setRemoveTarget(item),
          },
        ]
        return (
          <div className="flex justify-end">
            <ActionMenu items={menuItems} />
          </div>
        )
      },
    },
  ], [docMap, navigate])

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div>
      <PageHeader
        title="My Storage"
        subtitle="Your document vault — references to documents you've bookmarked for quick retrieval."
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="max-w-sm flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search title, description, tags…" />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Select value={sort} onChange={(e) => setSort(e.target.value as StorageSort)} options={SORT_OPTIONS} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={5} rows={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-zinc-50/50">
                    {table.getHeaderGroups().map((hg) => hg.headers.map((h) => (
                      <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    )))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 && (
                    <DataTableEmpty
                      colSpan={columns.length}
                      icon={Bookmark}
                      message={search ? 'No items match your search' : 'Your storage is empty — open any document and click Add to Storage to bookmark it.'}
                    />
                  )}
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataTablePagination table={table} />
          </>
        )}
      </div>

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove from Storage?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)} disabled={removeMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={removeMutation.isPending}
              onClick={() => removeTarget && removeMutation.mutate(removeTarget)}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-zinc-500">
          Removes <span className="font-medium text-zinc-700">{removeTarget?.title}</span> from your Storage.
          The original document is unaffected — you can add it back any time.
        </p>
      </Modal>
    </div>
  )
}
