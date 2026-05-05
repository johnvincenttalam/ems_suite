import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { Wrench, Plus, Play, CheckCircle2, ClipboardList } from 'lucide-react'
import { ChecklistPanel } from '@/shared/checklists'
import { useSearchParams } from 'react-router-dom'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useWorkOrders } from '@/features/maintenance'
import { useAssets } from '@/features/assets'
import { useUsers } from '@/features/users'
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '@/features/maintenance/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { cn } from '@/shared/utils/cn'

const workOrderSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  assetId: z.string().min(1, 'Asset is required'),
  assignedTo: z.string().min(1, 'Technician is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  scheduledDate: z.string().min(1, 'Schedule is required'),
})

type WorkOrderForm = z.infer<typeof workOrderSchema>

const statusFilters: { value: WorkOrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
]

const priorityStyles: Record<WorkOrderPriority, string> = {
  low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

export function WorkOrdersTab() {
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [searchParams] = useSearchParams()
  const [globalFilter, setGlobalFilter] = useState(searchParams.get('wo') ?? '')
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [inspectionWO, setInspectionWO] = useState<WorkOrder | null>(null)

  useEffect(() => {
    const woId = searchParams.get('wo')
    if (woId) setGlobalFilter(woId)
  }, [searchParams])

  const filtered = useMemo(
    () => statusFilter === 'all' ? workOrders : workOrders.filter((w) => w.status === statusFilter),
    [workOrders, statusFilter],
  )

  const handleStart = (wo: WorkOrder) => toast.success(`Started ${wo.id}`)
  const handleComplete = (wo: WorkOrder) => toast.success(`Completed ${wo.id}`)

  const columns = useMemo<ColumnDef<WorkOrder>[]>(() => [
    { accessorKey: 'id', header: 'Order', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span> },
    { accessorKey: 'title', header: 'Title', cell: ({ row }) => (
      <div>
        <p className="font-medium text-zinc-900">{row.original.title}</p>
        {row.original.description && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{row.original.description}</p>}
      </div>
    )},
    { accessorKey: 'assetId', header: 'Asset', cell: ({ getValue }) => {
      const asset = assetMap[getValue() as string]
      return asset ? (
        <div>
          <p className="text-[13px] text-zinc-700">{asset.name}</p>
          <p className="text-[11px] font-mono text-zinc-400">{asset.serialNumber}</p>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'priority', header: 'Priority', cell: ({ getValue }) => {
      const v = getValue() as WorkOrderPriority
      return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize', priorityStyles[v])}>{v}</span>
    }},
    { accessorKey: 'assignedTo', header: 'Technician', cell: ({ getValue }) => {
      const user = userMap[getValue() as string]
      return user ? (
        <div className="flex items-center gap-2">
          <Avatar name={user.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{user.name}</span>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'scheduledDate', header: 'Scheduled', cell: ({ getValue }) => format(new Date(getValue() as string), 'MMM dd, yyyy') },
    { id: 'actions', header: '', cell: ({ row }) => {
      const wo = row.original
      return (
        <div className="flex items-center gap-1">
          {wo.checklistId && (
            <button
              onClick={() => setInspectionWO(wo)}
              title="Open inspection checklist"
              className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            ><ClipboardList className="w-4 h-4" /></button>
          )}
          {wo.status === 'pending' && (
            <button onClick={() => handleStart(wo)} title="Start" className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Play className="w-4 h-4" />
            </button>
          )}
          {wo.status === 'ongoing' && (
            <button onClick={() => handleComplete(wo)} title="Mark complete" className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }},
  ], [assetMap, userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<WorkOrderForm>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { priority: 'medium' },
  })

  const onSubmit = (_data: WorkOrderForm) => {
    setShowNew(false)
    reset({ priority: 'medium' })
    toast.success('Work order created')
  }

  if (isLoading) return <TableSkeleton columns={8} rows={6} />

  const activeAssets = assets.filter((a) => a.status !== 'disposed')
  const activeUsers = users.filter((u) => u.status === 'active')

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search work orders..." />
          </div>
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="flex gap-2">
          <ExportMenu
            rows={workOrders as unknown as Record<string, unknown>[]}
            baseFilename="work-orders"
            sheetName="Work Orders"
            pdfTitle="Maintenance Work Orders"
            columns={[
              { key: 'id', label: 'Order' },
              { key: 'title', label: 'Title' },
              { key: 'assetId', label: 'Asset' },
              { key: 'priority', label: 'Priority' },
              { key: 'assignedTo', label: 'Technician' },
              { key: 'status', label: 'Status' },
              { key: 'scheduledDate', label: 'Scheduled' },
              { key: 'completedDate', label: 'Completed' },
            ]}
          />
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>New Work Order</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Wrench} message="No work orders match your filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal
        open={!!inspectionWO}
        onClose={() => setInspectionWO(null)}
        title={
          inspectionWO
            ? `Inspection · ${inspectionWO.id}`
            : 'Inspection'
        }
        size="lg"
      >
        {inspectionWO && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              {inspectionWO.title}
              {' · '}
              {assetMap[inspectionWO.assetId]?.name ?? inspectionWO.assetId}
            </p>
            <ChecklistPanel
              templateId={inspectionWO.checklistId}
              assignedToUserId={inspectionWO.assignedTo}
              readOnly={inspectionWO.status === 'completed'}
            />
          </div>
        )}
      </Modal>

      <Modal open={showNew} onClose={() => { setShowNew(false); reset({ priority: 'medium' }) }} title="New Work Order" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title *" {...register('title')} error={errors.title?.message} placeholder="e.g. Engine oil & filter service" />
          <Textarea label="Description" {...register('description')} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Asset *" {...register('assetId')} error={errors.assetId?.message} placeholder="Select asset" options={activeAssets.map((a) => ({ value: a.id, label: `${a.name} (${a.serialNumber})` }))} />
            <Select label="Technician *" {...register('assignedTo')} error={errors.assignedTo?.message} placeholder="Select technician" options={activeUsers.map((u) => ({ value: u.id, label: u.name }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority *" {...register('priority')} error={errors.priority?.message} options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]} />
            <Input label="Scheduled Date *" type="date" {...register('scheduledDate')} error={errors.scheduledDate?.message} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowNew(false); reset({ priority: 'medium' }) }}>Cancel</Button>
            <Button type="submit" fullWidth>Create Work Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
