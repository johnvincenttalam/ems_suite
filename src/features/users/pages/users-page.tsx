import { useCallback, useState, useMemo } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Users, Download, Trash2 } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { exportToCSV } from '@/shared/utils/export-csv'
import { useUsers } from '@/features/users'
import { usersApi } from '@/features/users/api/users-api'
import { useAuthStore } from '@/features/auth'
import type { User } from '@/features/users/types'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { RowActions } from '@/shared/ui/row-actions'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Avatar } from '@/shared/ui/avatar'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone is required'),
  status: z.enum(['active', 'inactive']),
})

type UserForm = z.infer<typeof userSchema>
type ModalMode = 'closed' | 'add' | 'edit'

const formDefaults: UserForm = { name: '', email: '', phone: '', status: 'active' }

export function UsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [globalFilter, setGlobalFilter] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<User | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: usersApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof usersApi.update>[1] & { id: string }) =>
      usersApi.update(id, input),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => usersApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => { setModalMode('closed'); setEditing(null); reset(formDefaults) }
  const openAdd = () => { setEditing(null); reset(formDefaults); setModalMode('add') }
  const openEdit = useCallback((u: User) => {
    setEditing(u)
    reset({ name: u.name, email: u.email, phone: u.phone ?? '', status: u.status })
    setModalMode('edit')
  }, [reset])

  const onSubmit = async (data: UserForm) => {
    if (!currentUser) { toast.error('Sign in required'); return }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data, updatedBy: currentUser.name })
        toast.success('User updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success(`Added ${data.name}`, { description: 'No module access yet — edit to assign permissions.' })
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

  const columns = useMemo<ColumnDef<User>[]>(() => [
    { accessorKey: 'name', header: 'User', cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.original.name} size="sm" />
        <div><p className="font-medium text-zinc-900">{row.original.name}</p><p className="text-xs text-zinc-400">{row.original.email}</p></div>
      </div>
    )},
    { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { id: 'modulesCount', header: 'Modules', cell: ({ row }) => <span className="tabular-nums text-zinc-700">{row.original.modules.length}</span> },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
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
    data: users, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  if (isLoading) return (
    <div>
      <PageHeader title="Users" subtitle="Loading..." />
      <TableSkeleton columns={7} rows={8} />
    </div>
  )

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} system users`} actions={
        <>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(users, 'users', [
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'phone', label: 'Phone' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Created' },
          ])}>
            Export
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add User</Button>
        </>
      } />
      <div className="mb-4 max-w-sm">
        <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search users..." />
      </div>
      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Users} message="No results found" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal open={modalMode !== 'closed'} onClose={closeModal} title={isEditing ? 'Edit User' : 'Add User'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} />
          <Input label="Email *" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Phone *" {...register('phone')} error={errors.phone?.message} />
          <Select label="Status *" {...register('status')} error={errors.status?.message} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]} />
          {!isEditing && (
            <p className="text-[12px] text-zinc-500">
              New users start with no module access. Edit them after creation to grant permissions.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" fullWidth loading={submitting}>{isEditing ? 'Save Changes' : 'Add User'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteCandidate} onClose={() => setDeleteCandidate(null)} title="Delete User" size="sm">
        {deleteCandidate && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-zinc-900">Delete {deleteCandidate.name}?</p>
                <p className="text-[12.5px] text-zinc-500 mt-1">{deleteCandidate.email} · {deleteCandidate.modules.length} module{deleteCandidate.modules.length === 1 ? '' : 's'}</p>
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
