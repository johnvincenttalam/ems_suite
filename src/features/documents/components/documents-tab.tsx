import { useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Archive, ChevronRight, FileText, GitBranch, Lock, Upload } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useDocuments } from '@/features/documents'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { documentsApi } from '@/features/documents/api/documents-api'
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  getLifecyclePhase,
  type AppDocument,
  type DocumentCategory,
  type DocumentPriority,
  type DocumentStatus,
} from '@/features/documents/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'
import { Select } from '@/shared/ui/select'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { FileIcon, formatFileSize } from './file-icon'
import { CategoryBadge, ConfidentialityBadge, PriorityBadge, TrackingBadge } from './document-meta'
import { UploadModal } from './upload-modal'
import { DocumentDetailDrawer } from './document-detail-drawer'
import { ClassifyModal } from './classify-modal'
import { StartWorkflowModal } from './start-workflow-modal'
import { FinalizeModal } from './finalize-modal'

const statusFilters: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function DocumentsTab() {
  const { data: documents = [], isLoading } = useDocuments()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<DocumentPriority | 'all'>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [drawerDoc, setDrawerDoc] = useState<AppDocument | null>(null)
  const [classifyTarget, setClassifyTarget] = useState<AppDocument | null>(null)
  const [workflowTarget, setWorkflowTarget] = useState<AppDocument | null>(null)
  const [finalizeTarget, setFinalizeTarget] = useState<AppDocument | null>(null)

  const deepLinkDocId = searchParams.get('doc')
  useEffect(() => {
    if (!deepLinkDocId || documents.length === 0) return
    const target = documents.find((d) => d.id === deepLinkDocId)
    if (target) setDrawerDoc(target)
  }, [deepLinkDocId, documents])

  const closeDrawer = () => {
    setDrawerDoc(null)
    if (searchParams.has('doc')) {
      const next = new URLSearchParams(searchParams)
      next.delete('doc')
      setSearchParams(next, { replace: true })
    }
  }

  const archiveMutation = useMutation({
    mutationFn: (doc: AppDocument) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.archive(doc.id, user.id)
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      toast.success(`Archived ${doc.trackingNumber ?? doc.id}`)
    },
    onError: (err) => toast.error('Archive failed', { description: err instanceof Error ? err.message : 'Unknown' }),
  })

  const filtered = useMemo(() => {
    return documents
      .filter((d) => d.status !== 'archived')
      .filter((d) => statusFilter === 'all' || d.status === statusFilter)
      .filter((d) => categoryFilter === 'all' || d.category === categoryFilter)
      .filter((d) => priorityFilter === 'all' || d.priority === priorityFilter)
  }, [documents, statusFilter, categoryFilter, priorityFilter])

  const columns = useMemo<ColumnDef<AppDocument>[]>(() => [
    {
      accessorKey: 'trackingNumber',
      header: 'Tracking #',
      cell: ({ row }) => <TrackingBadge trackingNumber={row.original.trackingNumber} />,
    },
    {
      accessorKey: 'title',
      header: 'Document',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <FileIcon type={row.original.fileType} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-zinc-900 truncate">{row.original.title}</p>
            <p className="text-[11px] text-zinc-400 truncate font-mono">{row.original.fileName}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category ? <CategoryBadge value={row.original.category} size="sm" /> : <span className="text-zinc-300">—</span>,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => row.original.priority ? <PriorityBadge value={row.original.priority} size="sm" /> : <span className="text-zinc-300">—</span>,
    },
    {
      accessorKey: 'confidentiality',
      header: 'Conf.',
      cell: ({ row }) => row.original.confidentiality ? <ConfidentialityBadge value={row.original.confidentiality} size="sm" /> : <span className="text-zinc-300">—</span>,
    },
    {
      accessorKey: 'fileSizeBytes',
      header: 'Size',
      cell: ({ getValue }) => <span className="text-zinc-500 tabular-nums whitespace-nowrap">{formatFileSize(getValue() as number)}</span>,
    },
    {
      accessorKey: 'version',
      header: 'v',
      cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-500">v{getValue() as number}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => <span className="whitespace-nowrap">{format(parseISO(getValue() as string), 'MMM dd, yyyy')}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} size="sm" />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const doc = row.original
        const phase = getLifecyclePhase(doc)
        return (
          <div className="flex items-center gap-1 justify-end">
            {phase === 'inbox' && (
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setClassifyTarget(doc) }}>
                Classify
              </Button>
            )}
            {phase === 'classified' && (
              <Button size="sm" variant="ghost" leftIcon={<GitBranch className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); setWorkflowTarget(doc) }}>
                Start
              </Button>
            )}
            {doc.status === 'approved' && !doc.finalizedAt && (
              <Button size="sm" variant="ghost" leftIcon={<Lock className="w-3.5 h-3.5" />} onClick={(e) => { e.stopPropagation(); setFinalizeTarget(doc) }}>
                Finalize
              </Button>
            )}
            {doc.status === 'approved' && doc.finalizedAt && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Archive className="w-3.5 h-3.5" />}
                loading={archiveMutation.isPending && archiveMutation.variables?.id === doc.id}
                onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(doc) }}
              >
                Archive
              </Button>
            )}
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </div>
        )
      },
    },
  ], [archiveMutation])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={9} rows={6} />

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search documents..." />
          </div>
          <div className="flex gap-2">
            <ExportMenu
              rows={documents.filter((d) => d.status !== 'archived') as unknown as Record<string, unknown>[]}
              baseFilename="documents"
              sheetName="Documents"
              pdfTitle="Documents"
              columns={[
                { key: 'trackingNumber', label: 'Tracking #' },
                { key: 'id', label: 'ID' },
                { key: 'title', label: 'Title' },
                { key: 'fileName', label: 'File' },
                { key: 'version', label: 'Version' },
                { key: 'category', label: 'Category' },
                { key: 'priority', label: 'Priority' },
                { key: 'confidentiality', label: 'Confidentiality' },
                { key: 'status', label: 'Status' },
                { key: 'createdBy', label: 'Created By' },
                { key: 'createdAt', label: 'Created' },
              ]}
            />
            <Button leftIcon={<Upload className="w-4 h-4" />} onClick={() => setShowUpload(true)}>Upload</Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
          <div className="flex gap-2 flex-wrap">
            <Select
              className="h-9 text-[13px]"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | 'all')}
              options={[
                { value: 'all', label: 'All categories' },
                ...(Object.keys(CATEGORY_LABEL) as DocumentCategory[]).map((k) => ({ value: k, label: CATEGORY_LABEL[k] })),
              ]}
            />
            <Select
              className="h-9 text-[13px]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as DocumentPriority | 'all')}
              options={[
                { value: 'all', label: 'All priorities' },
                ...(Object.keys(PRIORITY_LABEL) as DocumentPriority[]).map((k) => ({ value: k, label: PRIORITY_LABEL[k] })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50/50">
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setDrawerDoc(row.original)}
                  className="border-b border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={FileText} message="No documents match your filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
      <DocumentDetailDrawer document={drawerDoc} onClose={closeDrawer} />
      <ClassifyModal document={classifyTarget} onClose={() => setClassifyTarget(null)} />
      <StartWorkflowModal document={workflowTarget} onClose={() => setWorkflowTarget(null)} />
      <FinalizeModal document={finalizeTarget} onClose={() => setFinalizeTarget(null)} />
    </div>
  )
}
