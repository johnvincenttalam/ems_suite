import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { Boxes, Plus, UserCheck, ArrowLeftRight, Trash2, MapPin, ClipboardList } from 'lucide-react'
import { TrackingPanel } from '@/shared/tracking'
import { ChecklistPanel } from '@/shared/checklists'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAssets } from '@/features/assets'
import { useCategories } from '@/features/categories'
import { useWarehouses } from '@/features/warehouses'
import { useUsers } from '@/features/users'
import type { Asset, AssetStatus } from '@/features/assets/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'

const assetSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  serialNumber: z.string().min(2, 'Serial number is required'),
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().min(1, 'Location is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchaseCost: z.number().min(0).optional(),
})

type AssetForm = z.infer<typeof assetSchema>

const assignSchema = z.object({
  assignedTo: z.string().min(1, 'User is required'),
  notes: z.string().optional(),
})

type AssignForm = z.infer<typeof assignSchema>

const transferSchema = z.object({
  locationId: z.string().min(1, 'Destination is required'),
  notes: z.string().optional(),
})

type TransferForm = z.infer<typeof transferSchema>

const disposeSchema = z.object({
  reason: z.string().min(2, 'Reason is required'),
})

type DisposeForm = z.infer<typeof disposeSchema>

const statusFilters: { value: AssetStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'disposed', label: 'Disposed' },
]

export function RegistryTab() {
  const { data: assets = [], isLoading } = useAssets()
  const { data: categories = [] } = useCategories()
  const { data: warehouses = [] } = useWarehouses()
  const { data: users = [] } = useUsers()

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const locationMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null)
  const [activeAction, setActiveAction] = useState<'assign' | 'transfer' | 'dispose' | 'location' | 'inspection' | null>(null)

  const filtered = useMemo(
    () => statusFilter === 'all' ? assets : assets.filter((a) => a.status === statusFilter),
    [assets, statusFilter],
  )

  const assetCategories = useMemo(() => categories.filter((c) => c.type === 'asset'), [categories])

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    { accessorKey: 'serialNumber', header: 'Serial', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-500">{getValue() as string}</span> },
    { accessorKey: 'name', header: 'Asset', cell: ({ row }) => (
      <div>
        <p className="font-medium text-zinc-900">{row.original.name}</p>
        <p className="text-xs text-zinc-400">{categoryMap[row.original.categoryId]?.name ?? '—'}</p>
      </div>
    )},
    { accessorKey: 'locationId', header: 'Location', cell: ({ getValue }) => locationMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'assignedTo', header: 'Assigned To', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="text-zinc-400">Unassigned</span>
      const user = userMap[v]
      return user ? <span className="text-zinc-700">{user.name}</span> : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'purchaseDate', header: 'Purchased', cell: ({ getValue }) => format(new Date(getValue() as string), 'MMM dd, yyyy') },
    { id: 'actions', header: '', cell: ({ row }) => {
      const asset = row.original
      const canAssign = asset.status === 'active' && !asset.assignedTo
      const canTransfer = asset.status !== 'disposed'
      const canDispose = asset.status !== 'disposed'
      return (
        <div className="flex items-center gap-1">
          {asset.checklistId && (
            <button
              onClick={() => { setActiveAsset(asset); setActiveAction('inspection') }}
              title="Inspection checklist"
              className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            ><ClipboardList className="w-4 h-4" /></button>
          )}
          <button
            onClick={() => { setActiveAsset(asset); setActiveAction('location') }}
            title="View location"
            className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          ><MapPin className="w-4 h-4" /></button>
          {canAssign && (
            <button
              onClick={() => { setActiveAsset(asset); setActiveAction('assign') }}
              title="Assign"
              className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            ><UserCheck className="w-4 h-4" /></button>
          )}
          {canTransfer && (
            <button
              onClick={() => { setActiveAsset(asset); setActiveAction('transfer') }}
              title="Transfer"
              className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            ><ArrowLeftRight className="w-4 h-4" /></button>
          )}
          {canDispose && (
            <button
              onClick={() => { setActiveAsset(asset); setActiveAction('dispose') }}
              title="Dispose"
              className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            ><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      )
    }},
  ], [categoryMap, locationMap, userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const addForm = useForm<AssetForm>({ resolver: zodResolver(assetSchema) })
  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) })
  const transferForm = useForm<TransferForm>({ resolver: zodResolver(transferSchema) })
  const disposeForm = useForm<DisposeForm>({ resolver: zodResolver(disposeSchema) })

  const closeAction = () => {
    setActiveAsset(null)
    setActiveAction(null)
    assignForm.reset()
    transferForm.reset()
    disposeForm.reset()
  }

  const onAdd = (_data: AssetForm) => {
    setShowAdd(false)
    addForm.reset()
    toast.success('Asset registered')
  }

  const onAssign = (data: AssignForm) => {
    closeAction()
    toast.success(`Assigned ${activeAsset?.name} to ${userMap[data.assignedTo]?.name ?? 'user'}`)
  }

  const onTransfer = (data: TransferForm) => {
    closeAction()
    toast.success(`Transferred ${activeAsset?.name} to ${locationMap[data.locationId]?.name ?? 'new location'}`)
  }

  const onDispose = (_data: DisposeForm) => {
    closeAction()
    toast.success(`${activeAsset?.name} marked as disposed`)
  }

  if (isLoading) return <TableSkeleton columns={7} rows={6} />

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search assets..." />
          </div>
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="flex gap-2">
          <ExportMenu
            rows={assets as unknown as Record<string, unknown>[]}
            baseFilename="assets"
            sheetName="Assets"
            pdfTitle="Asset Registry"
            columns={[
              { key: 'serialNumber', label: 'Serial' },
              { key: 'name', label: 'Name' },
              { key: 'categoryId', label: 'Category' },
              { key: 'locationId', label: 'Location' },
              { key: 'status', label: 'Status' },
              { key: 'assignedTo', label: 'Assigned To' },
              { key: 'purchaseDate', label: 'Purchased' },
              { key: 'purchaseCost', label: 'Cost' },
            ]}
          />
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Register Asset</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Boxes} message="No assets found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset() }} title="Register Asset" size="lg">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" {...addForm.register('name')} error={addForm.formState.errors.name?.message} />
            <Input label="Serial Number *" {...addForm.register('serialNumber')} error={addForm.formState.errors.serialNumber?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category *" {...addForm.register('categoryId')} error={addForm.formState.errors.categoryId?.message} placeholder="Select category" options={assetCategories.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Location *" {...addForm.register('locationId')} error={addForm.formState.errors.locationId?.message} placeholder="Select location" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Purchase Date *" type="date" {...addForm.register('purchaseDate')} error={addForm.formState.errors.purchaseDate?.message} />
            <Input label="Purchase Cost" type="number" step="0.01" {...addForm.register('purchaseCost', { valueAsNumber: true, setValueAs: (v) => v === '' || v == null || Number.isNaN(v) ? undefined : Number(v) })} error={addForm.formState.errors.purchaseCost?.message} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowAdd(false); addForm.reset() }}>Cancel</Button>
            <Button type="submit" fullWidth>Register Asset</Button>
          </div>
        </form>
      </Modal>

      <Modal open={activeAction === 'assign'} onClose={closeAction} title={`Assign ${activeAsset?.name ?? 'Asset'}`} size="md">
        <form onSubmit={assignForm.handleSubmit(onAssign)} className="space-y-4">
          <Select label="Assign To *" {...assignForm.register('assignedTo')} error={assignForm.formState.errors.assignedTo?.message} placeholder="Select user" options={users.filter((u) => u.status === 'active').map((u) => ({ value: u.id, label: u.name }))} />
          <Textarea label="Notes" {...assignForm.register('notes')} rows={3} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction}>Cancel</Button>
            <Button type="submit" fullWidth>Confirm Assignment</Button>
          </div>
        </form>
      </Modal>

      <Modal open={activeAction === 'transfer'} onClose={closeAction} title={`Transfer ${activeAsset?.name ?? 'Asset'}`} size="md">
        <form onSubmit={transferForm.handleSubmit(onTransfer)} className="space-y-4">
          {activeAsset && (
            <p className="text-[13px] text-zinc-500">
              Currently at <span className="font-medium text-zinc-700">{locationMap[activeAsset.locationId]?.name ?? '—'}</span>
            </p>
          )}
          <Select label="To Location *" {...transferForm.register('locationId')} error={transferForm.formState.errors.locationId?.message} placeholder="Select destination" options={warehouses.filter((w) => w.id !== activeAsset?.locationId).map((w) => ({ value: w.id, label: w.name }))} />
          <Textarea label="Notes" {...transferForm.register('notes')} rows={3} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction}>Cancel</Button>
            <Button type="submit" fullWidth>Transfer</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={activeAction === 'inspection'}
        onClose={closeAction}
        title={
          activeAsset
            ? `Inspection · ${activeAsset.name}`
            : 'Inspection'
        }
        size="lg"
      >
        {activeAsset && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              <span className="font-mono">{activeAsset.serialNumber}</span>
              {activeAsset.assignedTo && (
                <> · assigned to {userMap[activeAsset.assignedTo]?.name ?? activeAsset.assignedTo}</>
              )}
            </p>
            <ChecklistPanel
              templateId={activeAsset.checklistId}
              assignedToUserId={activeAsset.assignedTo}
              readOnly={activeAsset.status === 'disposed'}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={activeAction === 'location'}
        onClose={closeAction}
        title={
          activeAsset
            ? `Location · ${activeAsset.name}`
            : 'Location'
        }
        size="lg"
      >
        {activeAsset && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              <span className="font-mono">{activeAsset.serialNumber}</span>
              {' · '}
              {locationMap[activeAsset.locationId]?.name ?? '—'}
            </p>
            <TrackingPanel entityType="asset" entityId={activeAsset.id} />
          </div>
        )}
      </Modal>

      <Modal open={activeAction === 'dispose'} onClose={closeAction} title={`Dispose ${activeAsset?.name ?? 'Asset'}`} size="md">
        <form onSubmit={disposeForm.handleSubmit(onDispose)} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            This marks the asset as disposed. It will be retained in the registry for audit purposes but excluded from active inventory.
          </p>
          <Textarea label="Reason *" {...disposeForm.register('reason')} rows={3} error={disposeForm.formState.errors.reason?.message} placeholder="e.g. End of life, irreparable damage, sold" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction}>Cancel</Button>
            <Button type="submit" variant="danger" fullWidth>Confirm Disposal</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
