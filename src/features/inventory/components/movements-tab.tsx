import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Edit3, Activity, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useInventoryItems, useStockMovements, inventoryApi } from '@/features/inventory'
import { useWarehouses } from '@/features/warehouses'
import { useAuthStore } from '@/features/auth'
import type { StockMovement, StockMovementType } from '@/features/inventory/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { cn } from '@/shared/utils/cn'

const movementSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  type: z.enum(['in', 'out', 'transfer', 'adjustment']),
  quantity: z.number().int(),
  sourceLocationId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  reason: z.string().min(2, 'Reason is required'),
}).refine((d) => d.type === 'in' ? !!d.destinationLocationId : true, { message: 'Destination is required', path: ['destinationLocationId'] })
  .refine((d) => d.type === 'out' || d.type === 'adjustment' ? !!d.sourceLocationId : true, { message: 'Source is required', path: ['sourceLocationId'] })
  .refine((d) => d.type === 'transfer' ? (!!d.sourceLocationId && !!d.destinationLocationId) : true, { message: 'Source and destination required for transfer', path: ['destinationLocationId'] })

type MovementForm = z.infer<typeof movementSchema>

const typeStyles: Record<StockMovementType, { label: string; className: string; Icon: typeof ArrowDownToLine }> = {
  in:         { label: 'Stock In',  className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: ArrowDownToLine },
  out:        { label: 'Stock Out', className: 'bg-red-50 text-red-700 border-red-200',             Icon: ArrowUpFromLine },
  transfer:   { label: 'Transfer',  className: 'bg-blue-50 text-blue-700 border-blue-200',          Icon: ArrowLeftRight },
  adjustment: { label: 'Adjust',    className: 'bg-amber-50 text-amber-700 border-amber-200',       Icon: Edit3 },
}

const typeFilters: { value: StockMovementType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'adjustment', label: 'Adjustments' },
]

export function MovementsTab() {
  const { data: movements = [], isLoading } = useStockMovements()
  const { data: items = [] } = useInventoryItems()
  const { data: warehouses = [] } = useWarehouses()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const addMovementMutation = useMutation({
    mutationFn: inventoryApi.addMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])

  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [defaultType, setDefaultType] = useState<StockMovementType>('in')

  const filtered = useMemo(
    () => typeFilter === 'all' ? movements : movements.filter((m) => m.type === typeFilter),
    [movements, typeFilter],
  )

  const columns = useMemo<ColumnDef<StockMovement>[]>(() => [
    { accessorKey: 'createdAt', header: 'Time', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">{format(new Date(getValue() as string), 'MMM dd, HH:mm')}</span>
    )},
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => {
      const v = getValue() as StockMovementType
      const cfg = typeStyles[v]
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium', cfg.className)}>
          <cfg.Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      )
    }},
    { accessorKey: 'itemId', header: 'Item', cell: ({ getValue }) => {
      const item = itemMap[getValue() as string]
      return item ? (
        <div>
          <p className="text-[13px] font-medium text-zinc-900">{item.name}</p>
          <p className="text-[11px] font-mono text-zinc-400">{item.sku}</p>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => {
      const v = row.original.quantity
      const isNeg = v < 0
      return <span className={cn('tabular-nums font-medium', isNeg && 'text-red-600')}>{isNeg ? v : `+${v}`}</span>
    }},
    { id: 'flow', header: 'From → To', cell: ({ row }) => {
      const src = row.original.sourceLocationId ? warehouseMap[row.original.sourceLocationId]?.name : null
      const dst = row.original.destinationLocationId ? warehouseMap[row.original.destinationLocationId]?.name : null
      if (src && dst) return <span className="text-zinc-600">{src} <span className="text-zinc-400">→</span> {dst}</span>
      if (dst) return <span className="text-zinc-600"><span className="text-zinc-400">→</span> {dst}</span>
      if (src) return <span className="text-zinc-600">{src} <span className="text-zinc-400">→</span></span>
      return <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'reason', header: 'Reason', cell: ({ getValue }) => <span className="text-zinc-600">{(getValue() as string) ?? '—'}</span> },
    { accessorKey: 'createdBy', header: 'By', cell: ({ getValue }) => <span className="text-zinc-500">{getValue() as string}</span> },
  ], [itemMap, warehouseMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  })

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: 'in', quantity: 1 },
  })

  const watchType = watch('type')

  const openCreate = (type: StockMovementType) => {
    setDefaultType(type)
    reset({ type, quantity: 1 })
    setShowModal(true)
  }

  const onSubmit = async (data: MovementForm) => {
    if (!currentUser) {
      toast.error('You must be signed in to record a movement')
      return
    }
    try {
      await addMovementMutation.mutateAsync({
        itemId: data.itemId,
        type: data.type,
        quantity: data.quantity,
        sourceLocationId: data.sourceLocationId,
        destinationLocationId: data.destinationLocationId,
        reason: data.reason,
        createdBy: currentUser.name,
      })
      toast.success('Stock movement recorded')
      setShowModal(false)
      reset({ type: defaultType, quantity: 1 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record movement'
      toast.error(message)
    }
  }

  if (isLoading) return <TableSkeleton columns={7} rows={6} />

  const showSource = watchType === 'out' || watchType === 'transfer' || watchType === 'adjustment'
  const showDestination = watchType === 'in' || watchType === 'transfer'

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search by item or reason...' }}
        filter={<FilterChips options={typeFilters} value={typeFilter} onChange={setTypeFilter} />}
      >
        <Button variant="outline" size="sm" leftIcon={<ArrowDownToLine className="w-4 h-4" />} onClick={() => openCreate('in')}>Stock In</Button>
        <Button variant="outline" size="sm" leftIcon={<ArrowUpFromLine className="w-4 h-4" />} onClick={() => openCreate('out')}>Stock Out</Button>
        <Button variant="outline" size="sm" leftIcon={<ArrowLeftRight className="w-4 h-4" />} onClick={() => openCreate('transfer')}>Transfer</Button>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openCreate('adjustment')}>Adjust</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Activity}
        emptyMessage="No movements match your filters"
      />

      <Modal open={showModal} onClose={() => { setShowModal(false); reset({ type: defaultType, quantity: 1 }) }} title={`Record ${typeStyles[defaultType].label}`} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Type *" {...register('type')} error={errors.type?.message} options={[
            { value: 'in', label: 'Stock In' },
            { value: 'out', label: 'Stock Out' },
            { value: 'transfer', label: 'Transfer' },
            { value: 'adjustment', label: 'Adjustment' },
          ]} />
          <Select label="Item *" {...register('itemId')} error={errors.itemId?.message} placeholder="Select item" options={items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))} />
          <Input label="Quantity *" type="number" {...register('quantity', { valueAsNumber: true })} error={errors.quantity?.message} helperText={watchType === 'adjustment' ? 'Use negative for shrinkage / loss' : undefined} />
          {showSource && (
            <Select label="From Location *" {...register('sourceLocationId')} error={errors.sourceLocationId?.message} placeholder="Select source" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          )}
          {showDestination && (
            <Select label="To Location *" {...register('destinationLocationId')} error={errors.destinationLocationId?.message} placeholder="Select destination" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          )}
          <Textarea label="Reason *" {...register('reason')} rows={2} error={errors.reason?.message} placeholder="e.g. PO-2025-0019 received" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth disabled={addMovementMutation.isPending} onClick={() => { setShowModal(false); reset({ type: defaultType, quantity: 1 }) }}>Cancel</Button>
            <Button type="submit" fullWidth loading={addMovementMutation.isPending}>Record Movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
