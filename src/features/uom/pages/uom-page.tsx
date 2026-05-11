import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ruler, Download, Plus, Trash2, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useUom } from '@/features/uom'
import { uomApi } from '@/features/uom/api/uom-api'
import { useAuthStore } from '@/features/auth'
import type { Uom } from '@/features/uom/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { PageHeader } from '@/shared/ui/page-header'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { TableSkeleton } from '@/shared/ui/table-skeleton'

const uomSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  symbol: z.string().min(1, 'Symbol is required').max(8, 'Symbol must be 8 characters or less'),
  description: z.string().optional(),
})

type UomForm = z.infer<typeof uomSchema>
type ModalMode = 'closed' | 'add' | 'edit'

const formDefaults: UomForm = { name: '', symbol: '', description: '' }

export function UomPage() {
  const { data: uom = [], isLoading } = useUom()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [globalFilter, setGlobalFilter] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<Uom | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Uom | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['uom'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const addMutation = useMutation({ mutationFn: uomApi.create, onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: Parameters<typeof uomApi.update>[1] & { id: string }) =>
      uomApi.update(id, input),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => uomApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<UomForm>({
    resolver: zodResolver(uomSchema),
    defaultValues: formDefaults,
  })

  const closeModal = () => { setModalMode('closed'); setEditing(null); reset(formDefaults) }
  const openAdd = () => { setEditing(null); reset(formDefaults); setModalMode('add') }
  const openEdit = useCallback((u: Uom) => {
    setEditing(u)
    reset({ name: u.name, symbol: u.symbol, description: u.description ?? '' })
    setModalMode('edit')
  }, [reset])

  const onSubmit = async (data: UomForm) => {
    if (!currentUser) { toast.error('Sign in required'); return }
    try {
      if (modalMode === 'edit' && editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data, updatedBy: currentUser.name })
        toast.success('UOM updated')
      } else {
        await addMutation.mutateAsync({ ...data, createdBy: currentUser.name })
        toast.success('UOM added')
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

  const columns = useMemo<ColumnDef<Uom>[]>(() => [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium text-zinc-900">{row.original.name}</span> },
    { accessorKey: 'symbol', header: 'Symbol', cell: ({ getValue }) => <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">{getValue() as string}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (getValue() as string) ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => format(new Date(getValue() as string), 'MMM dd, yyyy') },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const items: ActionMenuItem[] = [
          { key: 'edit', label: 'Edit', icon: Pencil, onClick: () => openEdit(row.original) },
          { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteCandidate(row.original) },
        ]
        return <div className="flex justify-end"><ActionMenu items={items} /></div>
      },
    },
  ], [openEdit])

  const table = useReactTable({
    data: uom, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const isEditing = modalMode === 'edit'
  const submitting = addMutation.isPending || updateMutation.isPending

  if (isLoading) return (
    <div>
      <PageHeader title="Units of Measure" subtitle="Loading..." />
      <TableSkeleton columns={5} rows={6} />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Units of Measure"
        subtitle={`${uom.length} UOM definitions`}
      />

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search units...' }}
      >
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(uom, 'uom', [
          { key: 'name', label: 'Name' },
          { key: 'symbol', label: 'Symbol' },
          { key: 'description', label: 'Description' },
          { key: 'createdAt', label: 'Created' },
        ])}>Export</Button>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add UOM</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Ruler}
        emptyMessage="No units found"
      />

      <Modal
        open={modalMode !== 'closed'}
        onClose={closeModal}
        title={isEditing ? 'Edit Unit of Measure' : 'Add Unit of Measure'}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={submitting} onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="uom-form" loading={submitting}>{isEditing ? 'Save Changes' : 'Add UOM'}</Button>
          </>
        }
      >
        <form id="uom-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name *" {...register('name')} error={errors.name?.message} />
          <Input label="Symbol *" {...register('symbol')} error={errors.symbol?.message} placeholder="e.g. kg, pc, L" />
          <Textarea label="Description" {...register('description')} rows={3} />
        </form>
      </Modal>

      <Modal
        open={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Delete UOM"
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
              <p className="text-[12.5px] text-zinc-500 mt-1">Symbol <span className="font-mono">{deleteCandidate.symbol}</span></p>
              <p className="text-[12.5px] text-zinc-500 mt-2">This cannot be undone.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
