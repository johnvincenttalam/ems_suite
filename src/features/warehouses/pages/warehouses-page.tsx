import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Warehouse as WarehouseIcon, Building, MapPin, Download, Plus, Trash2, Eye, Pencil } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useWarehouses } from '@/features/warehouses'
import { warehousesApi } from '@/features/warehouses/api/warehouses-api'
import { useAuthStore } from '@/features/auth'
import type { Warehouse, WarehouseType } from '@/features/warehouses/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { PageHeader } from '@/shared/ui/page-header'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'

const warehouseSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['warehouse', 'office', 'site']),
  address: z.string().min(5, 'Address is required'),
  contact: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
})

type WarehouseForm = z.infer<typeof warehouseSchema>
type ModalMode = 'closed' | 'add' | 'edit'

const typeIcon = {
  warehouse: WarehouseIcon,
  office: Building,
  site: MapPin,
} as const

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'warehouse', label: 'Warehouses' },
  { value: 'office', label: 'Offices' },
  { value: 'site', label: 'Sites' },
]

const formDefaults: WarehouseForm = { name: '', type: 'warehouse', address: '', contact: '', capacity: undefined }

export function WarehousesPage() {
  const { data: warehouses = [], isLoading } = useWarehouses()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<WarehouseType | 'all'>('all')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Warehouse | null>(null)

  const filtered = useMemo(
    () => typeFilter === 'all' ? warehouses : warehouses.filter((w) => w.type === typeFilter),
    [warehouses, typeFilter],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: warehousesApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof warehousesApi.update>[1] & { id: string }) =>
      warehousesApi.update(id, input),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => warehousesApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => { setModalMode('closed'); setEditing(null); reset(formDefaults) }
  const openAdd = () => { setEditing(null); reset(formDefaults); setModalMode('add') }
  const openEdit = useCallback((w: Warehouse) => {
    setEditing(w)
    reset({ name: w.name, type: w.type, address: w.address, contact: w.contact ?? '', capacity: w.capacity })
    setModalMode('edit')
  }, [reset])

  const columns = useMemo<ColumnDef<Warehouse>[]>(() => [
    { accessorKey: 'name', header: 'Location', cell: ({ row }) => {
      const Icon = typeIcon[row.original.type]
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center"><Icon className="w-4 h-4 text-zinc-500" /></div>
          <div>
            <p className="font-medium text-zinc-900">{row.original.name}</p>
            <p className="text-xs text-zinc-400">{row.original.address}</p>
          </div>
        </div>
      )
    }},
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => <span className="capitalize text-zinc-700">{getValue() as string}</span> },
    { accessorKey: 'contact', header: 'Contact', cell: ({ getValue }) => (getValue() as string) ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'capacity', header: 'Capacity', cell: ({ getValue }) => {
      const v = getValue() as number | undefined
      return v != null ? <span className="tabular-nums">{v.toLocaleString()}</span> : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => format(new Date(getValue() as string), 'MMM dd, yyyy') },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const items: ActionMenuItem[] = [
          { key: 'view', label: 'View', icon: Eye, onClick: () => toast.info('View details coming soon') },
          { key: 'edit', label: 'Edit', icon: Pencil, onClick: () => openEdit(row.original) },
          { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteCandidate(row.original) },
        ]
        return <div className="flex justify-end"><ActionMenu items={items} /></div>
      },
    },
  ], [openEdit])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const onSubmit = async (data: WarehouseForm) => {
    if (!currentUser) { toast.error('Sign in required'); return }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data, updatedBy: currentUser.name })
        toast.success('Location updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success('Location added')
      }
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const confirmDelete = async () => {
    if (!deleteCandidate || !currentUser) return
    try {
      await removeMutation.mutateAsync({ id: deleteCandidate.id, deletedBy: currentUser.name })
      toast.success(`Deleted ${deleteCandidate.name}`)
      setDeleteCandidate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  if (isLoading) return (
    <div>
      <PageHeader title="Warehouses & Locations" subtitle="Loading..." />
      <TableSkeleton columns={6} rows={6} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Warehouses & Locations"
        subtitle={`${warehouses.length} locations across the organization`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(warehouses, 'warehouses', [
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              { key: 'address', label: 'Address' },
              { key: 'contact', label: 'Contact' },
              { key: 'capacity', label: 'Capacity' },
              { key: 'createdAt', label: 'Created' },
            ])}>Export</Button>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Location</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search locations..." />
        </div>
        <FilterChips options={filterOptions} value={typeFilter} onChange={(v) => setTypeFilter(v as WarehouseType | 'all')} />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={WarehouseIcon} message="No locations found" description="Try adjusting your search or filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal open={modalMode !== 'closed'} onClose={closeModal} title={isEditing ? 'Edit Location' : 'Add Location'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} />
          <Select label="Type *" {...register('type')} error={errors.type?.message} options={[
            { value: 'warehouse', label: 'Warehouse' },
            { value: 'office', label: 'Office' },
            { value: 'site', label: 'Site' },
          ]} />
          <Input label="Address *" {...register('address')} error={errors.address?.message} />
          <Input label="Contact" {...register('contact')} error={errors.contact?.message} />
          <Input label="Capacity" type="number" {...register('capacity', { valueAsNumber: true, setValueAs: (v) => v === '' || v == null || Number.isNaN(v) ? undefined : Number(v) })} error={errors.capacity?.message} helperText="Storage capacity (optional)" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" fullWidth loading={submitting}>{isEditing ? 'Save Changes' : 'Add Location'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteCandidate} onClose={() => setDeleteCandidate(null)} title="Delete Location" size="sm">
        {deleteCandidate && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-zinc-900">Delete {deleteCandidate.name}?</p>
                <p className="text-[12.5px] text-zinc-500 mt-1 capitalize">{deleteCandidate.type} · {deleteCandidate.address}</p>
                <p className="text-[12.5px] text-zinc-500 mt-2">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" fullWidth disabled={removeMutation.isPending} onClick={() => setDeleteCandidate(null)}>Cancel</Button>
              <Button type="button" variant="danger" fullWidth loading={removeMutation.isPending} onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
