import { useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { Wrench, Plus, Play, CheckCircle2, ClipboardList, XCircle } from 'lucide-react'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { ChecklistPanel } from '@/shared/checklists'
import { useSearchParams } from 'react-router-dom'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useWorkOrders, maintenanceApi } from '@/features/maintenance'
import { useAssets } from '@/features/assets'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
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
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [searchParams] = useSearchParams()
  const [globalFilter, setGlobalFilter] = useState(searchParams.get('wo') ?? '')
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [inspectionWO, setInspectionWO] = useState<WorkOrder | null>(null)
  const [completingWO, setCompletingWO] = useState<WorkOrder | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [cancellingWO, setCancellingWO] = useState<WorkOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const woId = searchParams.get('wo')
    if (woId) setGlobalFilter(woId)
  }, [searchParams])

  const filtered = useMemo(
    () => statusFilter === 'all' ? workOrders : workOrders.filter((w) => w.status === statusFilter),
    [workOrders, statusFilter],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance'] })
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const startMutation = useMutation({
    mutationFn: (wo: WorkOrder) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.start(wo.id, currentUser.id)
    },
    onSuccess: (wo) => {
      toast.success(`Started ${wo.id}`)
      invalidate()
    },
    onError: (err) => toast.error('Start failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const completeMutation = useMutation({
    mutationFn: ({ wo, notes }: { wo: WorkOrder; notes?: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.complete(wo.id, currentUser.id, notes)
    },
    onSuccess: (wo) => {
      toast.success(`Completed ${wo.id}`)
      setCompletingWO(null)
      setCompletionNotes('')
      invalidate()
    },
    onError: (err) => toast.error('Complete failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ wo, reason }: { wo: WorkOrder; reason: string }) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.cancel(wo.id, currentUser.id, reason)
    },
    onSuccess: (wo) => {
      toast.success(`Cancelled ${wo.id}`)
      setCancellingWO(null)
      setCancelReason('')
      invalidate()
    },
    onError: (err) => toast.error('Cancel failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const createMutation = useMutation({
    mutationFn: (data: WorkOrderForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return maintenanceApi.create({
        title: data.title,
        description: data.description,
        assetId: data.assetId,
        assignedTo: data.assignedTo,
        priority: data.priority,
        scheduledDate: data.scheduledDate,
        createdBy: currentUser.id,
      })
    },
    onSuccess: (wo) => {
      toast.success(`Created ${wo.id}`)
      setShowNew(false)
      reset({ priority: 'medium' })
      invalidate()
    },
    onError: (err) => toast.error('Create failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

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
      const canCancel = wo.status === 'pending' || wo.status === 'ongoing'
      const items: ActionMenuItem[] = [
        ...(wo.checklistId ? [{
          key: 'inspection',
          label: 'Open inspection checklist',
          icon: ClipboardList,
          onClick: () => setInspectionWO(wo),
        }] : []),
        ...(wo.status === 'pending' ? [{
          key: 'start',
          label: 'Start work',
          icon: Play,
          disabled: startMutation.isPending,
          onClick: () => startMutation.mutate(wo),
        }] : []),
        ...(wo.status === 'ongoing' ? [{
          key: 'complete',
          label: 'Mark complete',
          icon: CheckCircle2,
          onClick: () => { setCompletingWO(wo); setCompletionNotes('') },
        }] : []),
        ...(canCancel ? [{
          key: 'cancel',
          label: 'Cancel work order',
          icon: XCircle,
          danger: true,
          onClick: () => { setCancellingWO(wo); setCancelReason('') },
        }] : []),
      ]
      return (
        <div className="flex items-center justify-end">
          <ActionMenu items={items} />
        </div>
      )
    }},
  ], [assetMap, userMap, startMutation])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<WorkOrderForm>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { priority: 'medium' },
  })

  const onSubmit = (data: WorkOrderForm) => createMutation.mutate(data)

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
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowNew(false); reset({ priority: 'medium' }) }} disabled={createMutation.isPending}>Cancel</Button>
            <Button type="submit" fullWidth loading={createMutation.isPending}>Create Work Order</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!completingWO} onClose={() => { setCompletingWO(null); setCompletionNotes('') }} title={`Complete ${completingWO?.id ?? ''}`} size="md">
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Mark this work order as completed. If this is the only open work order for{' '}
            <span className="font-medium text-zinc-700">{completingWO ? assetMap[completingWO.assetId]?.name ?? completingWO.assetId : ''}</span>,
            the asset will return to active status.
          </p>
          <Textarea
            label="Completion Notes"
            rows={3}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="e.g. Replaced air filter, topped off coolant — operating within spec"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setCompletingWO(null); setCompletionNotes('') }} disabled={completeMutation.isPending}>Cancel</Button>
            <Button
              type="button"
              variant="success"
              fullWidth
              loading={completeMutation.isPending}
              onClick={() => completingWO && completeMutation.mutate({ wo: completingWO, notes: completionNotes.trim() || undefined })}
            >
              Confirm Completion
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!cancellingWO} onClose={() => { setCancellingWO(null); setCancelReason('') }} title={`Cancel ${cancellingWO?.id ?? ''}`} size="md">
        <div className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Drop this work order before it's done. The asset returns to active status if no other open WOs remain.
          </p>
          <Textarea
            label="Reason *"
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Superseded by WO-2026-0099, technician unavailable"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setCancellingWO(null); setCancelReason('') }} disabled={cancelMutation.isPending}>Back</Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              loading={cancelMutation.isPending}
              disabled={cancelReason.trim().length < 2}
              onClick={() => cancellingWO && cancelMutation.mutate({ wo: cancellingWO, reason: cancelReason.trim() })}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
