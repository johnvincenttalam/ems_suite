import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
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
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search inbox...' }}
      >
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowReceipt(true)}>
          Register Receipt
        </Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Inbox}
        emptyMessage="Inbox is empty — every received document has been classified."
      />

      <RegisterReceiptModal open={showReceipt} onClose={() => setShowReceipt(false)} />
      <ClassifyModal document={classifyTarget} onClose={() => setClassifyTarget(null)} />
      <StartWorkflowModal document={workflowTarget} onClose={() => setWorkflowTarget(null)} />
    </div>
  )
}
