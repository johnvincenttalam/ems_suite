import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { Archive, BookmarkPlus, FileText, GitBranch, Lock, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getModulePath } from '@/config/modules'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useDepartments } from '@/features/departments'
import { documentsApi } from '@/features/documents/api/documents-api'
import {
  canDeleteDocument,
  canEditDocument,
  canUpload,
} from '@/features/documents/lib/sdms-permissions'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import {
  CATEGORY_LABEL,
  CONFIDENTIALITY_LABEL,
  DOCUMENT_STATUS_LABEL,
  PRIORITY_LABEL,
  getLifecyclePhase,
  type AppDocument,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentPriority,
  type DocumentStatus,
} from '@/features/documents/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Select } from '@/shared/ui/select'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { FileIcon, formatFileSize } from './file-icon'
import { CategoryBadge, ConfidentialityBadge, PriorityBadge, TrackingBadge } from './document-meta'
import { UploadModal } from './upload-modal'
import { ClassifyModal } from './classify-modal'
import { StartWorkflowModal } from './start-workflow-modal'
import { FinalizeModal } from './finalize-modal'
import { AddToStorageModal } from './add-to-storage-modal'

const statusFilters: { value: DocumentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Disapproved' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_URL_VALUES = ['all', 'draft', 'in_review', 'approved', 'rejected', 'archived'] as const

function statusFromUrl(raw: string | null): DocumentStatus | 'all' {
  if (!raw) return 'all'
  const normalized = raw.replace(/-/g, '_')
  return (STATUS_URL_VALUES as readonly string[]).includes(normalized)
    ? (normalized as DocumentStatus | 'all')
    : 'all'
}

function statusToUrl(value: DocumentStatus | 'all'): string {
  return value === 'all' ? '' : value.replace(/_/g, '-')
}

export function DocumentsTab() {
  const { data: documents = [], isLoading } = useDocuments()
  const { data: departments = [] } = useDepartments()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>(() => statusFromUrl(searchParams.get('status')))
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<DocumentPriority | 'all'>('all')
  const [confidentialityFilter, setConfidentialityFilter] = useState<DocumentConfidentiality | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [mineOnly, setMineOnly] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [classifyTarget, setClassifyTarget] = useState<AppDocument | null>(null)
  const [workflowTarget, setWorkflowTarget] = useState<AppDocument | null>(null)
  const [storageTarget, setStorageTarget] = useState<AppDocument | null>(null)
  const [finalizeTarget, setFinalizeTarget] = useState<AppDocument | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppDocument | null>(null)

  const canUploadDoc = canUpload(user)

  const urlStatus = searchParams.get('status')
  useEffect(() => {
    setStatusFilter(statusFromUrl(urlStatus))
  }, [urlStatus])

  const handleStatusChange = (next: DocumentStatus | 'all') => {
    setStatusFilter(next)
    const params = new URLSearchParams(searchParams)
    const url = statusToUrl(next)
    if (url) params.set('status', url)
    else params.delete('status')
    setSearchParams(params, { replace: true })
  }

  const deepLinkDocId = searchParams.get('doc')
  const handledDeepLinkRef = useRef<string | null>(null)
  useEffect(() => {
    if (!deepLinkDocId || documents.length === 0) return
    if (handledDeepLinkRef.current === deepLinkDocId) return
    const target = documents.find((d) => d.id === deepLinkDocId)
    if (!target) return
    handledDeepLinkRef.current = deepLinkDocId
    navigate(getModulePath('sdms', `documents/${target.id}`))
  }, [deepLinkDocId, documents, navigate])

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

  const deleteMutation = useMutation({
    mutationFn: (doc: AppDocument) => {
      if (!user) throw new Error('Not signed in')
      return documentsApi.deleteDocument(doc.id, user.id)
    },
    onSuccess: (_, doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      setDeleteTarget(null)
      toast.success(`Deleted ${doc.trackingNumber ?? doc.id}`)
    },
    onError: (err) => toast.error('Delete failed', { description: err instanceof Error ? err.message : 'Unknown' }),
  })

  const statusCounts = useMemo(() => {
    const counts: Record<DocumentStatus, number> = { draft: 0, in_review: 0, approved: 0, rejected: 0, archived: 0 }
    for (const d of documents) counts[d.status]++
    return counts
  }, [documents])

  const mineCount = useMemo(
    () => (user ? documents.filter((d) => d.createdBy === user.id).length : 0),
    [documents, user],
  )

  const filtered = useMemo(() => {
    return documents
      .filter((d) => statusFilter === 'all' || d.status === statusFilter)
      .filter((d) => categoryFilter === 'all' || d.category === categoryFilter)
      .filter((d) => priorityFilter === 'all' || d.priority === priorityFilter)
      .filter((d) => confidentialityFilter === 'all' || d.confidentiality === confidentialityFilter)
      .filter((d) => departmentFilter === 'all' || d.departmentId === departmentFilter)
      .filter((d) => !mineOnly || (user && d.createdBy === user.id))
  }, [documents, statusFilter, categoryFilter, priorityFilter, confidentialityFilter, departmentFilter, mineOnly, user])

  const columns = useMemo<ColumnDef<AppDocument>[]>(() => [
    {
      accessorKey: 'trackingNumber',
      header: 'Tracking #',
      cell: ({ row }) => <TrackingBadge trackingNumber={row.original.trackingNumber} />,
    },
    {
      accessorKey: 'title',
      header: 'Document',
      cell: ({ row }) => {
        const isMine = !!user && row.original.createdBy === user.id
        return (
          <div className="flex items-center gap-3">
            <FileIcon type={row.original.fileType} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-medium text-zinc-900 truncate">{row.original.title}</p>
                {isMine && (
                  <span
                    title="Created by you"
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 flex-shrink-0"
                  >
                    You
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate font-mono">{row.original.fileName}</p>
            </div>
          </div>
        )
      },
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
      cell: ({ getValue }) => {
        const s = getValue() as DocumentStatus
        return <StatusBadge status={s} label={DOCUMENT_STATUS_LABEL[s]} size="sm" />
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const doc = row.original
        const phase = getLifecyclePhase(doc)
        const mayEdit = canEditDocument(user, doc)
        const mayDelete = canDeleteDocument(user, doc)
        const items: ActionMenuItem[] = [
          doc.status === 'draft' && mayEdit && {
            key: 'edit',
            label: 'Edit',
            icon: Pencil,
            onClick: () => navigate(`${getModulePath('sdms', 'create-document')}?edit=${doc.id}`),
          },
          phase === 'inbox' && {
            key: 'classify',
            label: 'Classify',
            icon: FileText,
            onClick: () => setClassifyTarget(doc),
          },
          phase === 'classified' && {
            key: 'start',
            label: 'Start workflow',
            icon: GitBranch,
            onClick: () => setWorkflowTarget(doc),
          },
          doc.status === 'approved' && !doc.finalizedAt && {
            key: 'finalize',
            label: 'Finalize',
            icon: Lock,
            onClick: () => setFinalizeTarget(doc),
          },
          doc.status === 'approved' && doc.finalizedAt && {
            key: 'archive',
            label: 'Archive',
            icon: Archive,
            description: 'Lock with retention metadata',
            onClick: () => archiveMutation.mutate(doc),
            disabled: archiveMutation.isPending && archiveMutation.variables?.id === doc.id,
          },
          {
            key: 'storage',
            label: 'Add to Storage',
            icon: BookmarkPlus,
            onClick: () => setStorageTarget(doc),
          },
          mayDelete && {
            key: 'delete',
            label: 'Delete',
            icon: Trash2,
            danger: true,
            onClick: () => setDeleteTarget(doc),
          },
        ].filter(Boolean) as ActionMenuItem[]
        return (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={items} />
          </div>
        )
      },
    },
  ], [archiveMutation, navigate, user])

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
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search documents...' }}
        className="mb-3"
      >
        <ExportMenu
          rows={documents as unknown as Record<string, unknown>[]}
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
        {canUploadDoc && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate(getModulePath('sdms', 'create-document'))}>Create Document</Button>
        )}
        {canUploadDoc && (
          <Button variant="ghost" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setShowUpload(true)}>Upload</Button>
        )}
      </ListToolbar>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterChips
            options={statusFilters.map((f) => ({
              ...f,
              count: f.value === 'all' ? documents.length : statusCounts[f.value],
            }))}
            value={statusFilter}
            onChange={handleStatusChange}
          />
          {user && (
            <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-zinc-200 bg-white text-[12.5px] text-zinc-700 cursor-pointer hover:border-zinc-300 transition-colors">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => setMineOnly(e.target.checked)}
                className="accent-zinc-900"
              />
              <span>Only mine</span>
              <span className="text-zinc-400 tabular-nums">({mineCount})</span>
            </label>
          )}
        </div>
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
          <Select
            className="h-9 text-[13px]"
            value={confidentialityFilter}
            onChange={(e) => setConfidentialityFilter(e.target.value as DocumentConfidentiality | 'all')}
            options={[
              { value: 'all', label: 'All confidentiality' },
              ...(Object.keys(CONFIDENTIALITY_LABEL) as DocumentConfidentiality[]).map((k) => ({ value: k, label: CONFIDENTIALITY_LABEL[k] })),
            ]}
          />
          <Select
            className="h-9 text-[13px]"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All departments' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
      </div>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={FileText}
        emptyMessage="No documents match your filters"
        onRowClick={(row) => navigate(getModulePath('sdms', `documents/${row.id}`))}
      />

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
      <ClassifyModal document={classifyTarget} onClose={() => setClassifyTarget(null)} />
      <StartWorkflowModal document={workflowTarget} onClose={() => setWorkflowTarget(null)} />
      <FinalizeModal document={finalizeTarget} onClose={() => setFinalizeTarget(null)} />
      <AddToStorageModal document={storageTarget} onClose={() => setStorageTarget(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title ?? ''}"?`}
        message={
          deleteTarget?.status === 'draft'
            ? 'This draft will be removed permanently. The audit log keeps a record of the deletion.'
            : `This ${deleteTarget?.status} document will be removed permanently. This action cannot be undone — the audit log keeps a record of the deletion.`
        }
        confirmLabel="Delete"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </div>
  )
}
