import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { Archive, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { getModulePath } from '@/config/modules'
import { useDocuments } from '@/features/documents'
import { useUsers } from '@/features/users'
import type { AppDocument } from '@/features/documents/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { EmptyState } from '@/shared/ui/empty-state'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FileIcon, formatFileSize } from './file-icon'
import { TrackingBadge } from './document-meta'

export function ArchiveTab() {
  const { data: documents = [], isLoading } = useDocuments()
  const { data: users = [] } = useUsers()
  const navigate = useNavigate()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const archived = useMemo(() => documents.filter((d) => d.status === 'archived'), [documents])

  const [globalFilter, setGlobalFilter] = useState('')

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
      id: 'storage',
      header: 'Storage',
      cell: ({ row }) => row.original.archiveInfo?.storageLocation
        ? <span className="text-[12px] text-zinc-700 whitespace-nowrap">{row.original.archiveInfo.storageLocation}</span>
        : <span className="text-zinc-300">—</span>,
    },
    {
      id: 'retention',
      header: 'Retention',
      cell: ({ row }) => row.original.archiveInfo?.retentionMonths
        ? <span className="text-[12px] text-zinc-700 whitespace-nowrap">{row.original.archiveInfo.retentionMonths} mo</span>
        : <span className="text-zinc-300">—</span>,
    },
    {
      id: 'disposal',
      header: 'Disposal',
      cell: ({ row }) => row.original.archiveInfo?.disposalDate
        ? <span className="text-[12px] text-zinc-700 whitespace-nowrap">{row.original.archiveInfo.disposalDate}</span>
        : <span className="text-zinc-300">—</span>,
    },
    {
      accessorKey: 'fileSizeBytes',
      header: 'Size',
      cell: ({ getValue }) => <span className="text-zinc-500 tabular-nums whitespace-nowrap">{formatFileSize(getValue() as number)}</span>,
    },
    {
      accessorKey: 'archivedAt',
      header: 'Archived',
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined
        return v ? <span className="whitespace-nowrap">{format(parseISO(v), 'MMM dd, yyyy')}</span> : <span className="text-zinc-400">—</span>
      },
    },
    {
      accessorKey: 'createdBy',
      header: 'Author',
      cell: ({ getValue }) => userMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span>,
    },
    {
      id: 'chev',
      header: '',
      cell: () => <ChevronRight className="w-4 h-4 text-zinc-300" />,
    },
  ], [userMap])

  const table = useReactTable({
    data: archived,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={9} rows={4} />

  if (archived.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200/60">
        <EmptyState icon={Archive} title="No archived documents" description="Approved or completed documents that are archived will appear here." />
      </div>
    )
  }

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search archive...' }}
      >
        <ExportMenu
          rows={archived as unknown as Record<string, unknown>[]}
          baseFilename="archived-documents"
          sheetName="Archive"
          pdfTitle="Archived Documents"
          pdfSubtitle={`${archived.length} archived document${archived.length === 1 ? '' : 's'}`}
          columns={[
            { key: 'trackingNumber', label: 'Tracking #' },
            { key: 'id', label: 'ID' },
            { key: 'title', label: 'Title' },
            { key: 'fileName', label: 'File' },
            { key: 'archivedAt', label: 'Archived' },
            { key: 'createdBy', label: 'Author' },
            { key: 'createdAt', label: 'Created' },
          ]}
        />
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Archive}
        emptyMessage="No archived documents"
        onRowClick={(row) => navigate(getModulePath('sdms', `documents/${row.id}`))}
      />
    </div>
  )
}
