import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { Boxes, Plus, UserCheck, ArrowLeftRight, Trash2, MapPin, ClipboardList, Eye, Undo2 } from 'lucide-react'
import { TrackingPanel } from '@/shared/tracking'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAssets, assetsApi } from '@/features/assets'
import { useAssetsSettings } from '@/features/assets/store/assets-settings-store'
import type { Asset, AssetStatus, AssetCondition, DisposalType } from '@/features/assets/types'
import { useCategories } from '@/features/categories'
import { useWarehouses } from '@/features/warehouses'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { StatusBadge } from '@/shared/ui/status-badge'
import { ConditionPill } from '@/features/assets/components/condition-pill'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { AssetDetailDrawer } from '@/features/assets/components/asset-detail-drawer'

const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'out_of_service', label: 'Out of Service' },
]

const DISPOSAL_TYPES: { value: DisposalType; label: string }[] = [
  { value: 'sold', label: 'Sold' },
  { value: 'scrapped', label: 'Scrapped' },
  { value: 'donated', label: 'Donated' },
  { value: 'lost', label: 'Lost' },
  { value: 'traded_in', label: 'Traded In' },
]

const assetSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  serialNumber: z.string().min(2, 'Serial number is required'),
  assetCode: z.string().optional(),
  model: z.string().optional(),
  vendor: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().min(1, 'Location is required'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'out_of_service'] as const),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchaseCost: z.number().min(0).optional(),
  warrantyExpiry: z.string().optional(),
  usefulLifeMonths: z.number().int().positive().optional(),
  salvageValue: z.number().min(0).optional(),
  description: z.string().optional(),
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
  type: z.enum(['sold', 'scrapped', 'donated', 'lost', 'traded_in'] as const),
  amount: z.number().min(0).optional(),
  disposedTo: z.string().optional(),
  disposedDate: z.string().min(1, 'Disposal date is required'),
  reason: z.string().min(2, 'Reason is required'),
  approverName: z.string().min(1, 'Approver is required'),
})

type DisposeForm = z.infer<typeof disposeSchema>

const statusFilters: { value: AssetStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retiring', label: 'Retiring' },
  { value: 'disposed', label: 'Disposed' },
]

export function RegistryTab() {
  const { data: assets = [], isLoading } = useAssets()
  const { data: categories = [] } = useCategories()
  const { data: warehouses = [] } = useWarehouses()
  const { data: users = [] } = useUsers()
  const currentUser = useAuthStore((s) => s.user)
  const settings = useAssetsSettings((s) => s.settings)
  const queryClient = useQueryClient()

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const locationMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null)
  const [activeAction, setActiveAction] = useState<'assign' | 'return' | 'transfer' | 'dispose' | 'location' | 'inspection' | 'view' | null>(null)

  const filtered = useMemo(
    () => statusFilter === 'all' ? assets : assets.filter((a) => a.status === statusFilter),
    [assets, statusFilter],
  )

  const assetCategories = useMemo(() => categories.filter((c) => c.type === 'asset'), [categories])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addForm = useForm<AssetForm>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      condition: 'good',
      locationId: settings.defaultLocationId || undefined,
      usefulLifeMonths: settings.defaultDepreciationMonths,
    },
  })
  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) })
  const transferForm = useForm<TransferForm>({ resolver: zodResolver(transferSchema) })
  const disposeForm = useForm<DisposeForm>({
    resolver: zodResolver(disposeSchema),
    defaultValues: { type: 'sold', disposedDate: format(new Date(), 'yyyy-MM-dd') },
  })

  const closeAction = () => {
    setActiveAsset(null)
    setActiveAction(null)
    assignForm.reset()
    transferForm.reset({})
    disposeForm.reset({ type: 'sold', disposedDate: format(new Date(), 'yyyy-MM-dd') })
  }

  const addMutation = useMutation({
    mutationFn: (data: AssetForm) => {
      if (!currentUser) throw new Error('Not signed in')
      return assetsApi.create({ ...data, createdBy: currentUser.name })
    },
    onSuccess: (asset) => {
      toast.success(`Registered ${asset.name}`)
      setShowAdd(false)
      addForm.reset({
        condition: 'good',
        locationId: settings.defaultLocationId || undefined,
        usefulLifeMonths: settings.defaultDepreciationMonths,
      })
      invalidate()
    },
    onError: (err) => toast.error('Register failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const assignMutation = useMutation({
    mutationFn: (data: AssignForm) => {
      if (!activeAsset || !currentUser) throw new Error('Asset or user missing')
      return assetsApi.assign({
        assetId: activeAsset.id,
        userId: data.assignedTo,
        notes: data.notes,
        actorName: currentUser.name,
      })
    },
    onSuccess: ({ asset, assignment }) => {
      const u = userMap[assignment.assignedTo]
      toast.success(`Assigned ${asset.name} to ${u?.name ?? assignment.assignedTo}`)
      closeAction()
      invalidate()
    },
    onError: (err) => toast.error('Assignment failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const returnMutation = useMutation({
    mutationFn: () => {
      if (!activeAsset || !currentUser) throw new Error('Asset or user missing')
      return assetsApi.return({ assetId: activeAsset.id, actorName: currentUser.name })
    },
    onSuccess: (asset) => {
      toast.success(`${asset.name} returned`)
      closeAction()
      invalidate()
    },
    onError: (err) => toast.error('Return failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const transferMutation = useMutation({
    mutationFn: (data: TransferForm) => {
      if (!activeAsset || !currentUser) throw new Error('Asset or user missing')
      return assetsApi.transfer({
        assetId: activeAsset.id,
        toLocationId: data.locationId,
        notes: data.notes,
        actorName: currentUser.name,
      })
    },
    onSuccess: (asset) => {
      const dest = locationMap[asset.locationId]
      toast.success(`Transferred ${asset.name} to ${dest?.name ?? asset.locationId}`)
      closeAction()
      invalidate()
    },
    onError: (err) => toast.error('Transfer failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const disposeMutation = useMutation({
    mutationFn: (data: DisposeForm) => {
      if (!activeAsset || !currentUser) throw new Error('Asset or user missing')
      return assetsApi.submitDisposal({
        assetId: activeAsset.id,
        type: data.type,
        amount: data.amount,
        disposedTo: data.disposedTo,
        disposedDate: data.disposedDate,
        reason: data.reason,
        approverName: data.approverName,
        submittedBy: currentUser.name,
      })
    },
    onSuccess: (asset) => {
      toast.success(`Disposal of ${asset.name} submitted — awaiting approval`)
      closeAction()
      invalidate()
    },
    onError: (err) => toast.error('Disposal submit failed', { description: err instanceof Error ? err.message : 'Unknown error' }),
  })

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    { accessorKey: 'assetCode', header: 'Code', cell: ({ row }) => (
      <button
        onClick={() => { setActiveAsset(row.original); setActiveAction('view') }}
        className="font-mono text-[12px] text-zinc-700 hover:text-zinc-900 hover:underline cursor-pointer"
      >
        {row.original.assetCode}
      </button>
    )},
    { accessorKey: 'name', header: 'Asset', cell: ({ row }) => (
      <div>
        <p className="font-medium text-zinc-900">{row.original.name}</p>
        <p className="text-xs text-zinc-400">{categoryMap[row.original.categoryId]?.name ?? '—'}</p>
      </div>
    )},
    { accessorKey: 'serialNumber', header: 'Serial', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-500">{getValue() as string}</span> },
    { accessorKey: 'locationId', header: 'Location', cell: ({ getValue }) => locationMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'assignedTo', header: 'Assigned', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="text-zinc-400">Unassigned</span>
      const user = userMap[v]
      return user ? <span className="text-zinc-700">{user.name}</span> : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'condition', header: 'Condition', cell: ({ row }) => <ConditionPill condition={row.original.condition} /> },
    { id: 'actions', header: '', cell: ({ row }) => {
      const asset = row.original
      const canAssign = asset.status === 'active' && !asset.assignedTo
      const canReturn = asset.status !== 'disposed' && !!asset.assignedTo
      const canTransfer = asset.status !== 'disposed'
      const canDispose = asset.status === 'active' || asset.status === 'maintenance'
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setActiveAsset(asset); setActiveAction('view') }}
            title="View details"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          ><Eye className="w-4 h-4" /></button>
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
          {canReturn && (
            <button
              onClick={() => { setActiveAsset(asset); setActiveAction('return') }}
              title="Return from assignment"
              className="p-1.5 rounded-md text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            ><Undo2 className="w-4 h-4" /></button>
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
              title="Dispose / retire"
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

  const approverOptions = users
    .filter((u) => u.status === 'active' && u.moduleAdmins.includes('assets') && u.name !== currentUser?.name)
    .map((u) => ({ value: u.name, label: u.name + (u.position ? ` — ${u.position}` : '') }))

  if (isLoading) return <TableSkeleton columns={8} rows={6} />

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
              { key: 'assetCode', label: 'Code' },
              { key: 'serialNumber', label: 'Serial' },
              { key: 'name', label: 'Name' },
              { key: 'categoryId', label: 'Category' },
              { key: 'locationId', label: 'Location' },
              { key: 'status', label: 'Status' },
              { key: 'condition', label: 'Condition' },
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

      <Modal open={showAdd} onClose={() => { setShowAdd(false); addForm.reset({ condition: 'good', locationId: settings.defaultLocationId || undefined, usefulLifeMonths: settings.defaultDepreciationMonths }) }} title="Register Asset" size="lg">
        <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" {...addForm.register('name')} error={addForm.formState.errors.name?.message} />
            <Input label="Serial Number *" {...addForm.register('serialNumber')} error={addForm.formState.errors.serialNumber?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Asset Code (optional)" {...addForm.register('assetCode')} placeholder="Auto-generated if blank" />
            <Input label="Model" {...addForm.register('model')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vendor" {...addForm.register('vendor')} />
            <Select label="Condition *" {...addForm.register('condition')} options={CONDITION_OPTIONS} error={addForm.formState.errors.condition?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category *" {...addForm.register('categoryId')} error={addForm.formState.errors.categoryId?.message} placeholder="Select category" options={assetCategories.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Location *" {...addForm.register('locationId')} error={addForm.formState.errors.locationId?.message} placeholder="Select location" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Purchase Date *" type="date" {...addForm.register('purchaseDate')} error={addForm.formState.errors.purchaseDate?.message} />
            <Input label="Purchase Cost" type="number" step="0.01" {...addForm.register('purchaseCost', { setValueAs: (v) => v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v) })} error={addForm.formState.errors.purchaseCost?.message} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Warranty Expiry" type="date" {...addForm.register('warrantyExpiry')} />
            <Input label="Useful Life (months)" type="number" {...addForm.register('usefulLifeMonths', { setValueAs: (v) => v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v) })} />
            <Input label="Salvage Value" type="number" step="0.01" {...addForm.register('salvageValue', { setValueAs: (v) => v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v) })} />
          </div>
          <Textarea label="Description" {...addForm.register('description')} rows={2} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowAdd(false); addForm.reset({ condition: 'good', locationId: settings.defaultLocationId || undefined, usefulLifeMonths: settings.defaultDepreciationMonths }) }} disabled={addMutation.isPending}>Cancel</Button>
            <Button type="submit" fullWidth loading={addMutation.isPending}>Register Asset</Button>
          </div>
        </form>
      </Modal>

      <Modal open={activeAction === 'assign'} onClose={closeAction} title={`Assign ${activeAsset?.name ?? 'Asset'}`} size="md">
        <form onSubmit={assignForm.handleSubmit((d) => assignMutation.mutate(d))} className="space-y-4">
          <Select label="Assign To *" {...assignForm.register('assignedTo')} error={assignForm.formState.errors.assignedTo?.message} placeholder="Select user" options={users.filter((u) => u.status === 'active').map((u) => ({ value: u.id, label: u.name }))} />
          <Textarea label="Notes" {...assignForm.register('notes')} rows={3} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction} disabled={assignMutation.isPending}>Cancel</Button>
            <Button type="submit" fullWidth loading={assignMutation.isPending}>Confirm Assignment</Button>
          </div>
        </form>
      </Modal>

      <Modal open={activeAction === 'return'} onClose={closeAction} title={`Return ${activeAsset?.name ?? 'Asset'}`} size="md">
        <div className="space-y-4">
          {activeAsset?.assignedTo && (
            <p className="text-[13px] text-zinc-500">
              Currently assigned to <span className="font-medium text-zinc-700">{userMap[activeAsset.assignedTo]?.name ?? activeAsset.assignedTo}</span>.
              Returning closes the open assignment record and frees the asset for reassignment.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction} disabled={returnMutation.isPending}>Cancel</Button>
            <Button type="button" fullWidth loading={returnMutation.isPending} onClick={() => returnMutation.mutate()}>Confirm Return</Button>
          </div>
        </div>
      </Modal>

      <Modal open={activeAction === 'transfer'} onClose={closeAction} title={`Transfer ${activeAsset?.name ?? 'Asset'}`} size="md">
        <form onSubmit={transferForm.handleSubmit((d) => transferMutation.mutate(d))} className="space-y-4">
          {activeAsset && (
            <p className="text-[13px] text-zinc-500">
              Currently at <span className="font-medium text-zinc-700">{locationMap[activeAsset.locationId]?.name ?? '—'}</span>
            </p>
          )}
          <Select label="To Location *" {...transferForm.register('locationId')} error={transferForm.formState.errors.locationId?.message} placeholder="Select destination" options={warehouses.filter((w) => w.id !== activeAsset?.locationId).map((w) => ({ value: w.id, label: w.name }))} />
          <Textarea label="Notes" {...transferForm.register('notes')} rows={3} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction} disabled={transferMutation.isPending}>Cancel</Button>
            <Button type="submit" fullWidth loading={transferMutation.isPending}>Transfer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={activeAction === 'dispose'} onClose={closeAction} title={`Dispose / Retire ${activeAsset?.name ?? 'Asset'}`} size="md">
        <form onSubmit={disposeForm.handleSubmit((d) => disposeMutation.mutate(d))} className="space-y-4">
          <p className="text-[13px] text-zinc-500">
            Submitting moves the asset to <span className="font-medium text-zinc-700">Retiring</span>. The named approver
            finalizes (or rejects) the disposal — only on approval is the status flipped to Disposed.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Disposal Type *" {...disposeForm.register('type')} options={DISPOSAL_TYPES} error={disposeForm.formState.errors.type?.message} />
            <Input label="Disposal Date *" type="date" {...disposeForm.register('disposedDate')} error={disposeForm.formState.errors.disposedDate?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Disposal Amount" type="number" step="0.01" placeholder="e.g. sale proceeds" {...disposeForm.register('amount', { setValueAs: (v) => v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v) })} />
            <Input label="Disposed To" placeholder="e.g. EcoMetals Recycling" {...disposeForm.register('disposedTo')} />
          </div>
          <Select label="Approving Authority *" {...disposeForm.register('approverName')} placeholder="Select approver" options={approverOptions} error={disposeForm.formState.errors.approverName?.message} />
          <Textarea label="Reason *" {...disposeForm.register('reason')} rows={3} error={disposeForm.formState.errors.reason?.message} placeholder="e.g. Beyond economic repair" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={closeAction} disabled={disposeMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="danger" fullWidth loading={disposeMutation.isPending}>Submit for Approval</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={activeAction === 'inspection'}
        onClose={closeAction}
        title={activeAsset ? `Inspection · ${activeAsset.name}` : 'Inspection'}
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
            <p className="text-[12px] text-zinc-500 mb-3">
              Open the asset detail drawer ({' '}
              <button
                onClick={() => setActiveAction('view')}
                className="underline hover:text-zinc-900"
              >Inspections tab</button>
              ) to record a structured pass/fail check.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={activeAction === 'location'}
        onClose={closeAction}
        title={activeAsset ? `Location · ${activeAsset.name}` : 'Location'}
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

      <AssetDetailDrawer
        open={activeAction === 'view'}
        asset={activeAsset}
        onClose={closeAction}
      />
    </div>
  )
}
