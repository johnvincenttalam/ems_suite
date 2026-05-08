import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Boxes, Plus, AlertTriangle, Trash2, MapPin, Pencil } from 'lucide-react'
import { TrackingPanel } from '@/shared/tracking'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useInventoryItems, inventoryApi } from '@/features/inventory'
import { useCategories } from '@/features/categories'
import { useUom } from '@/features/uom'
import { useWarehouses } from '@/features/warehouses'
import { useAuthStore } from '@/features/auth'
import type { InventoryItem } from '@/features/inventory/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { cn } from '@/shared/utils/cn'

const itemSchema = z.object({
  sku: z.string().min(2, 'SKU is required'),
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  uomId: z.string().min(1, 'UOM is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  unitCost: z.number().min(0).optional(),
})

type ItemForm = z.infer<typeof itemSchema>

type StockFilter = 'all' | 'low' | 'ok'
type ModalMode = 'closed' | 'add' | 'edit'

const stockFilters: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low Stock' },
  { value: 'ok', label: 'In Stock' },
]

const formDefaults: ItemForm = {
  sku: '', name: '', description: '', categoryId: '', uomId: '', warehouseId: '',
  quantity: 0, reorderLevel: 0, unitCost: undefined,
}

export function ItemsTab() {
  const { data: items = [], isLoading } = useInventoryItems()
  const { data: categories = [] } = useCategories()
  const { data: uom = [] } = useUom()
  const { data: warehouses = [] } = useWarehouses()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const uomMap = useMemo(() => Object.fromEntries(uom.map((u) => [u.id, u])), [uom])
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])

  const [searchParams] = useSearchParams()
  const [globalFilter, setGlobalFilter] = useState(searchParams.get('item') ?? '')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryItem | null>(null)
  const [locationItem, setLocationItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
    const itemId = searchParams.get('item')
    if (itemId) setGlobalFilter(itemId)
  }, [searchParams])

  const filtered = useMemo(() => {
    if (stockFilter === 'all') return items
    if (stockFilter === 'low') return items.filter((i) => i.quantity <= i.reorderLevel)
    return items.filter((i) => i.quantity > i.reorderLevel)
  }, [items, stockFilter])

  const inventoryCategories = useMemo(() => categories.filter((c) => c.type === 'inventory'), [categories])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: inventoryApi.addItem, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof inventoryApi.updateItem>[1] & { id: string }) =>
      inventoryApi.updateItem(id, input),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => inventoryApi.deleteItem(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => {
    setModalMode('closed')
    setEditingItem(null)
    reset(formDefaults)
  }

  const openAdd = () => {
    setEditingItem(null)
    reset(formDefaults)
    setModalMode('add')
  }

  const openEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item)
    reset({
      sku: item.sku,
      name: item.name,
      description: item.description ?? '',
      categoryId: item.categoryId,
      uomId: item.uomId,
      warehouseId: item.warehouseId,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
    })
    setModalMode('edit')
  }, [reset])

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    { accessorKey: 'sku', header: 'SKU', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-500">{getValue() as string}</span> },
    { accessorKey: 'name', header: 'Item', cell: ({ row }) => (
      <div>
        <p className="font-medium text-zinc-900">{row.original.name}</p>
        {row.original.description && <p className="text-xs text-zinc-400 mt-0.5">{row.original.description}</p>}
      </div>
    )},
    { accessorKey: 'categoryId', header: 'Category', cell: ({ getValue }) => categoryMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'warehouseId', header: 'Location', cell: ({ getValue }) => warehouseMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'quantity', header: 'On Hand', cell: ({ row }) => {
      const isLow = row.original.quantity <= row.original.reorderLevel
      const symbol = uomMap[row.original.uomId]?.symbol ?? ''
      return (
        <div className="flex items-center gap-2">
          <span className={cn('tabular-nums font-medium', isLow ? 'text-amber-600' : 'text-zinc-900')}>
            {row.original.quantity.toLocaleString()}
          </span>
          {symbol && <span className="text-[11px] text-zinc-400 font-mono">{symbol}</span>}
          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
        </div>
      )
    }},
    { accessorKey: 'reorderLevel', header: 'Reorder', cell: ({ getValue }) => <span className="tabular-nums text-zinc-500">{(getValue() as number).toLocaleString()}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        const items: ActionMenuItem[] = [
          { key: 'edit', label: 'Edit item', icon: Pencil, onClick: () => openEdit(item) },
          { key: 'location', label: 'View location', icon: MapPin, onClick: () => setLocationItem(item) },
          { key: 'delete', label: 'Delete item', icon: Trash2, danger: true, onClick: () => setDeleteCandidate(item) },
        ]
        return (
          <div className="flex items-center justify-end">
            <ActionMenu items={items} />
          </div>
        )
      },
    },
  ], [categoryMap, uomMap, warehouseMap, openEdit])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const onSubmit = async (data: ItemForm) => {
    if (!currentUser) {
      toast.error('You must be signed in')
      return
    }
    try {
      if (modalMode === 'edit' && editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...data, updatedBy: currentUser.name })
        toast.success('Item updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success('Item added')
      }
      closeModal()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      toast.error(message)
    }
  }

  const confirmDelete = async () => {
    if (!deleteCandidate || !currentUser) return
    try {
      await deleteMutation.mutateAsync({ id: deleteCandidate.id, deletedBy: currentUser.name })
      toast.success(`Deleted ${deleteCandidate.name}`)
      setDeleteCandidate(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      toast.error(message)
    }
  }

  if (isLoading) return <TableSkeleton columns={7} rows={6} />

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search items..." />
          </div>
          <FilterChips options={stockFilters} value={stockFilter} onChange={setStockFilter} />
        </div>
        <div className="flex gap-2">
          <ExportMenu
            rows={items as unknown as Record<string, unknown>[]}
            baseFilename="inventory-items"
            sheetName="Items"
            pdfTitle="Inventory Items"
            pdfSubtitle={`${items.length} item${items.length === 1 ? '' : 's'}`}
            columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Name' },
              { key: 'description', label: 'Description' },
              { key: 'categoryId', label: 'Category' },
              { key: 'warehouseId', label: 'Warehouse' },
              { key: 'quantity', label: 'Quantity' },
              { key: 'reorderLevel', label: 'Reorder Level' },
              { key: 'unitCost', label: 'Unit Cost' },
            ]}
          />
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Item</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Boxes} message="No items found" description="Try adjusting your search or filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal
        open={!!locationItem}
        onClose={() => setLocationItem(null)}
        title={
          locationItem
            ? `Location · ${locationItem.name}`
            : 'Location'
        }
        size="lg"
      >
        {locationItem && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              <span className="font-mono">{locationItem.sku}</span>
              {' · '}
              {warehouseMap[locationItem.warehouseId]?.name ?? '—'}
              {' · qty '}
              {locationItem.quantity.toLocaleString()}
            </p>
            <TrackingPanel entityType="item" entityId={locationItem.id} />
          </div>
        )}
      </Modal>

      <Modal open={modalMode !== 'closed'} onClose={closeModal} title={isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU *" {...register('sku')} error={errors.sku?.message} placeholder="e.g. OS-PEN-BLU" />
            <Input label="Name *" {...register('name')} error={errors.name?.message} />
          </div>
          <Textarea label="Description" {...register('description')} rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Category *" {...register('categoryId')} error={errors.categoryId?.message} placeholder="Select category" options={inventoryCategories.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="UOM *" {...register('uomId')} error={errors.uomId?.message} placeholder="Select UOM" options={uom.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))} />
            <Select label="Warehouse *" {...register('warehouseId')} error={errors.warehouseId?.message} placeholder="Select warehouse" options={warehouses.filter((w) => w.type === 'warehouse').map((w) => ({ value: w.id, label: w.name }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Quantity *" type="number" {...register('quantity', { valueAsNumber: true })} error={errors.quantity?.message} />
            <Input label="Reorder Level *" type="number" {...register('reorderLevel', { valueAsNumber: true })} error={errors.reorderLevel?.message} />
            <Input label="Unit Cost" type="number" step="0.01" {...register('unitCost', { valueAsNumber: true, setValueAs: (v) => v === '' || v == null || Number.isNaN(v) ? undefined : Number(v) })} error={errors.unitCost?.message} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" fullWidth loading={submitting}>{isEditing ? 'Save Changes' : 'Add Item'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteCandidate} onClose={() => setDeleteCandidate(null)} title="Delete Inventory Item" size="sm">
        {deleteCandidate && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-zinc-900">Delete {deleteCandidate.name}?</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">
                  SKU <span className="font-mono">{deleteCandidate.sku}</span>
                  {deleteCandidate.quantity > 0 && (
                    <> · current on-hand: <span className="font-medium text-amber-600">{deleteCandidate.quantity.toLocaleString()}</span></>
                  )}
                </p>
                <p className="text-[12.5px] text-zinc-500 mt-2">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" fullWidth disabled={deleteMutation.isPending} onClick={() => setDeleteCandidate(null)}>Cancel</Button>
              <Button type="button" variant="danger" fullWidth loading={deleteMutation.isPending} onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
