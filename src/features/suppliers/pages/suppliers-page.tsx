import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Download, Plus, Mail, Phone, Trash2, Eye, Pencil } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useSuppliers } from '@/features/suppliers'
import { suppliersApi } from '@/features/suppliers/api/suppliers-api'
import { useAuthStore } from '@/features/auth'
import type { Supplier } from '@/features/suppliers/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { PageHeader } from '@/shared/ui/page-header'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { StatusBadge } from '@/shared/ui/status-badge'

const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  contactNumber: z.string().min(7, 'Contact number is required'),
  email: z.string().email('Valid email is required'),
  address: z.string().min(5, 'Address is required'),
  status: z.enum(['active', 'inactive']),
})

type SupplierForm = z.infer<typeof supplierSchema>
type ModalMode = 'closed' | 'add' | 'edit'

const formDefaults: SupplierForm = {
  name: '', contactPerson: '', contactNumber: '', email: '', address: '', status: 'active',
}

export function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [globalFilter, setGlobalFilter] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: suppliersApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof suppliersApi.update>[1] & { id: string }) =>
      suppliersApi.update(id, input),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => suppliersApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => { setModalMode('closed'); setEditing(null); reset(formDefaults) }
  const openAdd = () => { setEditing(null); reset(formDefaults); setModalMode('add') }
  const openEdit = useCallback((s: Supplier) => {
    setEditing(s)
    reset({ name: s.name, contactPerson: s.contactPerson, contactNumber: s.contactNumber, email: s.email, address: s.address, status: s.status })
    setModalMode('edit')
  }, [reset])

  const onSubmit = async (data: SupplierForm) => {
    if (!currentUser) { toast.error('Sign in required'); return }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data, updatedBy: currentUser.name })
        toast.success('Supplier updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success('Supplier added')
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

  const columns = useMemo<ColumnDef<Supplier>[]>(() => [
    { accessorKey: 'name', header: 'Supplier', cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center"><Truck className="w-4 h-4 text-zinc-500" /></div>
        <div>
          <p className="font-medium text-zinc-900">{row.original.name}</p>
          <p className="text-xs text-zinc-400">{row.original.contactPerson}</p>
        </div>
      </div>
    )},
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1.5 text-zinc-600"><Mail className="w-3.5 h-3.5 text-zinc-400" />{getValue() as string}</span>
    )},
    { accessorKey: 'contactNumber', header: 'Phone', cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1.5 text-zinc-600"><Phone className="w-3.5 h-3.5 text-zinc-400" />{getValue() as string}</span>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
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
    data: suppliers, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  if (isLoading) return (
    <div>
      <PageHeader title="Suppliers" subtitle="Loading..." />
      <TableSkeleton columns={6} rows={6} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} supplier records`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(suppliers, 'suppliers', [
              { key: 'name', label: 'Name' },
              { key: 'contactPerson', label: 'Contact Person' },
              { key: 'contactNumber', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'address', label: 'Address' },
              { key: 'status', label: 'Status' },
              { key: 'createdAt', label: 'Created' },
            ])}>Export</Button>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Supplier</Button>
          </>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search suppliers..." />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Truck} message="No suppliers found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal
        open={modalMode !== 'closed'}
        onClose={closeModal}
        title={isEditing ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="supplier-form" loading={submitting}>{isEditing ? 'Save Changes' : 'Add Supplier'}</Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Person *" {...register('contactPerson')} error={errors.contactPerson?.message} />
            <Input label="Phone *" {...register('contactNumber')} error={errors.contactNumber?.message} />
          </div>
          <Input label="Email *" type="email" {...register('email')} error={errors.email?.message} />
          <Textarea label="Address *" {...register('address')} rows={3} error={errors.address?.message} />
          <Select label="Status *" {...register('status')} error={errors.status?.message} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]} />
        </form>
      </Modal>

      <Modal
        open={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Supplier"
        size="sm"
        footer={
          deleteCandidate && (
            <>
              <Button type="button" variant="secondary" disabled={removeMutation.isPending} onClick={() => setDeleteCandidate(null)}>Cancel</Button>
              <Button type="button" variant="danger" loading={removeMutation.isPending} onClick={confirmDelete}>Delete</Button>
            </>
          )
        }
      >
        {deleteCandidate && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-zinc-900">Delete {deleteCandidate.name}?</p>
              <p className="text-[12.5px] text-zinc-500 mt-1">{deleteCandidate.email}</p>
              <p className="text-[12.5px] text-zinc-500 mt-2">This cannot be undone.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
