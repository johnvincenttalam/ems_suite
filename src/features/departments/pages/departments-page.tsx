import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Download, Plus, Trash2 } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useDepartments } from '@/features/departments'
import { departmentsApi } from '@/features/departments/api/departments-api'
import { useAuthStore } from '@/features/auth'
import type { Department } from '@/features/departments/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { PageHeader } from '@/shared/ui/page-header'
import { RowActions } from '@/shared/ui/row-actions'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'

const departmentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required').max(10, 'Code must be 10 characters or less'),
  manager: z.string().optional(),
  headcount: z.number({ message: 'Headcount must be a number' }).int().min(0, 'Headcount must be 0 or greater'),
})

type DepartmentForm = z.infer<typeof departmentSchema>
type ModalMode = 'closed' | 'add' | 'edit'

const formDefaults: DepartmentForm = { name: '', code: '', manager: '', headcount: 0 }

export function DepartmentsPage() {
  const { data: departments = [], isLoading } = useDepartments()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [globalFilter, setGlobalFilter] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Department | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: departmentsApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof departmentsApi.update>[1] & { id: string }) =>
      departmentsApi.update(id, input),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => departmentsApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DepartmentForm>({
    resolver: zodResolver(departmentSchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => { setModalMode('closed'); setEditing(null); reset(formDefaults) }
  const openAdd = () => { setEditing(null); reset(formDefaults); setModalMode('add') }
  const openEdit = useCallback((d: Department) => {
    setEditing(d)
    reset({ name: d.name, code: d.code, manager: d.manager ?? '', headcount: d.headcount })
    setModalMode('edit')
  }, [reset])

  const onSubmit = async (data: DepartmentForm) => {
    if (!currentUser) { toast.error('Sign in required'); return }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data, updatedBy: currentUser.name })
        toast.success('Department updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success('Department added')
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

  const columns = useMemo<ColumnDef<Department>[]>(() => [
    { accessorKey: 'code', header: 'Code', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-500">{getValue() as string}</span> },
    { accessorKey: 'name', header: 'Department', cell: ({ row }) => <span className="font-medium text-zinc-900">{row.original.name}</span> },
    { accessorKey: 'manager', header: 'Manager', cell: ({ getValue }) => (getValue() as string) ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'headcount', header: 'Headcount', cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => format(new Date(getValue() as string), 'MMM dd, yyyy') },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RowActions
          onView={() => toast.info('View details coming soon')}
          onEdit={() => openEdit(row.original)}
          onDelete={() => setDeleteCandidate(row.original)}
        />
      ),
    },
  ], [openEdit])

  const table = useReactTable({
    data: departments, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  if (isLoading) return (
    <div>
      <PageHeader title="Departments" subtitle="Loading..." />
      <TableSkeleton columns={6} rows={6} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} departments`}
        actions={
          <>
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(departments, 'departments', [
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Name' },
              { key: 'manager', label: 'Manager' },
              { key: 'headcount', label: 'Headcount' },
              { key: 'createdAt', label: 'Created' },
            ])}>Export</Button>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Department</Button>
          </>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search departments..." />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Building2} message="No departments found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal open={modalMode !== 'closed'} onClose={closeModal} title={isEditing ? 'Edit Department' : 'Add Department'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} />
          <Input label="Code *" {...register('code')} error={errors.code?.message} placeholder="e.g. OPS" />
          <Input label="Manager" {...register('manager')} error={errors.manager?.message} />
          <Input label="Headcount *" type="number" {...register('headcount', { valueAsNumber: true })} error={errors.headcount?.message} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" fullWidth loading={submitting}>{isEditing ? 'Save Changes' : 'Add Department'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteCandidate} onClose={() => setDeleteCandidate(null)} title="Delete Department" size="sm">
        {deleteCandidate && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-zinc-900">Delete {deleteCandidate.name}?</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">Code <span className="font-mono">{deleteCandidate.code}</span> · {deleteCandidate.headcount} people</p>
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
