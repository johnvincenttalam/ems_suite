import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Inbox, ClipboardList, GitBranch, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useDocuments } from '@/features/documents'
import { useUsers } from '@/features/users'
import { useDepartments } from '@/features/departments'
import {
  RECEIPT_MODE_LABEL,
  getLifecyclePhase,
  type AppDocument,
} from '@/features/documents/types'
import { Button } from '@/shared/ui/button'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FileIcon, formatFileSize } from './file-icon'
import { TrackingBadge } from './document-meta'
import { RegisterReceiptModal } from './register-receipt-modal'
import { ClassifyModal } from './classify-modal'
import { StartWorkflowModal } from './start-workflow-modal'

export function InboxTab() {
  const { data: documents = [], isLoading } = useDocuments()
  const { data: users = [] } = useUsers()
  const { data: departments = [] } = useDepartments()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments])

  const inbox = useMemo(
    () => documents.filter((d) => d.status === 'draft'),
    [documents],
  )

  const [globalFilter, setGlobalFilter] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [classifyTarget, setClassifyTarget] = useState<AppDocument | null>(null)
  const [workflowTarget, setWorkflowTarget] = useState<AppDocument | null>(null)

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
      id: 'receivedFrom',
      header: 'Received From',
      cell: ({ row }) => {
        const r = row.original.receipt
        return r ? (
          <div>
            <p className="text-[13px] text-zinc-700 truncate max-w-[180px]">{r.senderSource}</p>
            <p className="text-[11px] text-zinc-400">via {RECEIPT_MODE_LABEL[r.mode]}</p>
          </div>
        ) : <span className="text-zinc-300">—</span>
      },
    },
    {
      id: 'recipient',
      header: 'For',
      cell: ({ row }) => {
        const dept = deptMap[row.original.receipt?.recipientDept ?? '']
        return dept ? <span className="text-[13px] text-zinc-700">{dept.name}</span> : <span className="text-zinc-300">—</span>
      },
    },
    {
      accessorKey: 'fileSizeBytes',
      header: 'Size',
      cell: ({ getValue }) => <span className="text-zinc-500 tabular-nums whitespace-nowrap">{formatFileSize(getValue() as number)}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Received',
      cell: ({ getValue }) => format(parseISO(getValue() as string), 'MMM dd, HH:mm'),
    },
    {
      accessorKey: 'createdBy',
      header: 'Logged by',
      cell: ({ getValue }) => userMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const phase = getLifecyclePhase(row.original)
        if (phase === 'inbox') {
          return (
            <Button size="sm" variant="outline" leftIcon={<ClipboardList className="w-3.5 h-3.5" />} onClick={() => setClassifyTarget(row.original)}>
              Classify
            </Button>
          )
        }
        return (
          <Button size="sm" leftIcon={<GitBranch className="w-3.5 h-3.5" />} onClick={() => setWorkflowTarget(row.original)}>
            Start Workflow
          </Button>
        )
      },
    },
  ], [userMap, deptMap])

  const table = useReactTable({
    data: inbox,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={8} rows={4} />

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="max-w-sm flex-1">
          <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search inbox..." />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowReceipt(true)}>
          Register Receipt
        </Button>
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
                <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Inbox} message="Inbox is empty — every received document has been classified." />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <RegisterReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} />
      <ClassifyModal document={classifyTarget} onClose={() => setClassifyTarget(null)} />
      <StartWorkflowModal document={workflowTarget} onClose={() => setWorkflowTarget(null)} />
    </div>
  )
}
