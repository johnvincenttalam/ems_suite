import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Download, Plus, Trash2, Eye, Pencil } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useCategories } from '@/features/categories'
import { categoriesApi } from '@/features/categories/api/categories-api'
import { useAuthStore } from '@/features/auth'
import type { Category, CategoryType } from '@/features/categories/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { Badge } from '@/shared/ui/badge'
import { PageHeader } from '@/shared/ui/page-header'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'

const categorySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['asset', 'inventory']),
  description: z.string().optional(),
})

type CategoryForm = z.infer<typeof categorySchema>
type ModalMode = 'closed' | 'add' | 'edit'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'asset', label: 'Asset' },
  { value: 'inventory', label: 'Inventory' },
]

const formDefaults: CategoryForm = { name: '', type: 'asset', description: '' }

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<CategoryType | 'all'>('all')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null)

  const filtered = useMemo(
    () => typeFilter === 'all' ? categories : categories.filter((c) => c.type === typeFilter),
    [categories, typeFilter],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: categoriesApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof categoriesApi.update>[1] & { id: string }) =>
      categoriesApi.update(id, input),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => categoriesApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => { setModalMode('closed'); setEditing(null); reset(formDefaults) }
  const openAdd = () => { setEditing(null); reset(formDefaults); setModalMode('add') }
  const openEdit = useCallback((c: Category) => {
    setEditing(c)
    reset({ name: c.name, type: c.type, description: c.description ?? '' })
    setModalMode('edit')
  }, [reset])

  const onSubmit = async (data: CategoryForm) => {
    if (!currentUser) { toast.error('Sign in required'); return }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data, updatedBy: currentUser.name })
        toast.success('Category updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success('Category added')
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

  const columns = useMemo<ColumnDef<Category>[]>(() => [
    { accessorKey: 'name', header: 'Category', cell: ({ row }) => (
      <div>
        <p className="font-medium text-zinc-900">{row.original.name}</p>
        {row.original.description && <p className="text-xs text-zinc-400 mt-0.5">{row.original.description}</p>}
      </div>
    )},
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => {
      const v = getValue() as CategoryType
      return <Badge variant={v === 'asset' ? 'default' : 'outline'} size="sm" className="capitalize">{v}</Badge>
    }},
    { accessorKey: 'itemCount', header: 'Items', cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as number).toLocaleString()}</span> },
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

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  if (isLoading) return (
    <div>
      <PageHeader title="Categories" subtitle="Loading..." />
      <TableSkeleton columns={5} rows={6} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} asset & inventory categories`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(categories, 'categories', [
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              { key: 'description', label: 'Description' },
              { key: 'itemCount', label: 'Items' },
              { key: 'createdAt', label: 'Created' },
            ])}>Export</Button>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Category</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="max-w-sm flex-1">
          <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search categories..." />
        </div>
        <FilterChips options={filterOptions} value={typeFilter} onChange={(v) => setTypeFilter(v as CategoryType | 'all')} />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Tag} message="No categories found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal
        open={modalMode !== 'closed'}
        onClose={closeModal}
        title={isEditing ? 'Edit Category' : 'Add Category'}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="category-form" loading={submitting}>{isEditing ? 'Save Changes' : 'Add Category'}</Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} />
          <Select label="Type *" {...register('type')} error={errors.type?.message} options={[
            { value: 'asset', label: 'Asset' },
            { value: 'inventory', label: 'Inventory' },
          ]} />
          <Textarea label="Description" {...register('description')} rows={3} />
        </form>
      </Modal>

      <Modal
        open={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Category"
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
              <p className="text-[12.5px] text-zinc-500 mt-1 capitalize">{deleteCandidate.type} category</p>
              {deleteCandidate.itemCount > 0 && (
                <p className="text-[12.5px] text-amber-600 mt-2">{deleteCandidate.itemCount} items reference this — deletion will be blocked.</p>
              )}
              <p className="text-[12.5px] text-zinc-500 mt-2">This cannot be undone.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
