import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { ClipboardList, Plus, Undo2 } from 'lucide-react'
import { format } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAssetAssignments, useAssets, useAssignAsset, useReturnAsset } from '@/features/assets'
import { useUsers } from '@/features/users'
import { useAuthStore } from '@/features/auth'
import { useAssetsSettings } from '@/features/assets/store/assets-settings-store'
import type { AssetAssignment } from '@/features/assets/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { SearchableSelect } from '@/shared/ui/searchable-select'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'

type AssignmentFilter = 'all' | 'active' | 'returned'

const filterOptions: { value: AssignmentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'returned', label: 'Returned' },
]

const assignSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  assignedTo: z.string().min(1, 'User is required'),
  notes: z.string().optional(),
})

type AssignForm = z.infer<typeof assignSchema>

export function AssignmentsTab() {
  const { data: assignments = [], isLoading } = useAssetAssignments()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()
  const currentUser = useAuthStore((s) => s.user)
  const settings = useAssetsSettings((s) => s.settings)
  const assignMutation = useAssignAsset()
  const returnMutation = useReturnAsset()

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AssignmentFilter>('all')
  const [assignOpen, setAssignOpen] = useState(false)
  const [returnTarget, setReturnTarget] = useState<AssetAssignment | null>(null)
  const [returnNotes, setReturnNotes] = useState('')

  const assignForm = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
    defaultValues: { assetId: '', assignedTo: '', notes: '' },
  })

  const assignableAssets = useMemo(
    () => assets.filter((a) => !a.assignedTo && a.status === 'active'),
    [assets],
  )

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return assignments
    if (statusFilter === 'active') return assignments.filter((a) => !a.returnedDate)
    return assignments.filter((a) => !!a.returnedDate)
  }, [assignments, statusFilter])

  function openAssign() {
    assignForm.reset({ assetId: '', assignedTo: '', notes: '' })
    setAssignOpen(true)
  }

  function closeAssign() {
    setAssignOpen(false)
    assignForm.reset({ assetId: '', assignedTo: '', notes: '' })
  }

  function onAssignSubmit(data: AssignForm) {
    if (!currentUser) {
      toast.error('You must be signed in')
      return
    }
    assignMutation.mutate(
      {
        assetId: data.assetId,
        userId: data.assignedTo,
        notes: data.notes,
        actorName: currentUser.name,
      },
      {
        onSuccess: ({ asset, assignment }) => {
          const u = userMap[assignment.assignedTo]
          toast.success(`Assigned ${asset.name} to ${u?.name ?? assignment.assignedTo}`)
          closeAssign()
        },
        onError: (err) =>
          toast.error('Assignment failed', {
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
      },
    )
  }

  function closeReturn() {
    setReturnTarget(null)
    setReturnNotes('')
  }

  function onReturnSubmit() {
    if (!returnTarget || !currentUser) return
    if (settings.requireReturnNotes && returnNotes.trim().length < 2) {
      toast.error('Return notes are required (per Settings → Assignments)')
      return
    }
    returnMutation.mutate(
      {
        assetId: returnTarget.assetId,
        actorName: currentUser.name,
        notes: returnNotes.trim() || undefined,
      },
      {
        onSuccess: (asset) => {
          toast.success(`${asset.name} returned`)
          closeReturn()
        },
        onError: (err) =>
          toast.error('Return failed', {
            description: err instanceof Error ? err.message : 'Unknown error',
          }),
      },
    )
  }

  const columns = useMemo<ColumnDef<AssetAssignment>[]>(() => [
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-500">{format(new Date(getValue() as string), 'MMM dd, yyyy')}</span>
    )},
    { accessorKey: 'assetId', header: 'Asset', cell: ({ getValue }) => {
      const asset = assetMap[getValue() as string]
      return asset ? (
        <div>
          <p className="text-[13px] font-medium text-zinc-900">{asset.name}</p>
          <p className="text-[11px] font-mono text-zinc-400">{asset.serialNumber}</p>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'assignedTo', header: 'Assignee', cell: ({ getValue }) => {
      const user = userMap[getValue() as string]
      return user ? (
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{user.name}</span>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'returnedDate', header: 'Returned', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (v) return <span className="text-zinc-500">{format(new Date(v), 'MMM dd, yyyy')}</span>
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">Active</span>
    }},
    { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => <span className="text-zinc-600">{(getValue() as string) ?? '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => {
      if (row.original.returnedDate) return null
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setReturnTarget(row.original)
            setReturnNotes('')
          }}
          title="Mark returned"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Return
        </button>
      )
    }},
  ], [assetMap, userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  const returnAsset = returnTarget ? assetMap[returnTarget.assetId] : undefined
  const returnUser = returnTarget ? userMap[returnTarget.assignedTo] : undefined
  const returnNotesRequired = settings.requireReturnNotes

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search assignments...' }}
        filter={<FilterChips options={filterOptions} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={assignments as unknown as Record<string, unknown>[]}
          baseFilename="asset-assignments"
          sheetName="Assignments"
          pdfTitle="Asset Assignments"
          columns={[
            { key: 'assignedDate', label: 'Assigned' },
            { key: 'assetId', label: 'Asset' },
            { key: 'assignedTo', label: 'Assigned To' },
            { key: 'returnedDate', label: 'Returned' },
            { key: 'notes', label: 'Notes' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAssign} disabled={assignableAssets.length === 0}>
          Assign Asset
        </Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={ClipboardList}
        emptyMessage="No assignments to show"
      />

      <Modal
        open={assignOpen}
        onClose={closeAssign}
        title="Assign Asset"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={assignMutation.isPending} onClick={closeAssign}>
              Cancel
            </Button>
            <Button type="submit" form="asset-assign-form" loading={assignMutation.isPending}>
              Confirm Assignment
            </Button>
          </>
        }
      >
        <form id="asset-assign-form" onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
          {assignableAssets.length === 0 ? (
            <p className="text-[12.5px] text-zinc-500">
              No assets are currently available for assignment. Return an active assignment first, or register a new asset.
            </p>
          ) : (
            <>
              <Controller
                name="assetId"
                control={assignForm.control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Asset *"
                    placeholder="Select asset"
                    searchPlaceholder="Search by name or serial…"
                    value={field.value}
                    onChange={field.onChange}
                    error={assignForm.formState.errors.assetId?.message}
                    options={assignableAssets.map((a) => ({
                      value: a.id,
                      label: `${a.name} · ${a.serialNumber}`,
                    }))}
                  />
                )}
              />
              <Controller
                name="assignedTo"
                control={assignForm.control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Assign To *"
                    placeholder="Select user"
                    searchPlaceholder="Search users…"
                    value={field.value}
                    onChange={field.onChange}
                    error={assignForm.formState.errors.assignedTo?.message}
                    options={users
                      .filter((u) => u.status === 'active')
                      .map((u) => ({ value: u.id, label: u.name }))}
                  />
                )}
              />
              <Textarea label="Notes" {...assignForm.register('notes')} rows={3} />
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={!!returnTarget}
        onClose={closeReturn}
        title={`Return ${returnAsset?.name ?? 'Asset'}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={returnMutation.isPending} onClick={closeReturn}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={returnMutation.isPending}
              disabled={returnNotesRequired && returnNotes.trim().length < 2}
              onClick={onReturnSubmit}
            >
              Confirm Return
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {returnUser && (
            <p className="text-[13px] text-zinc-500">
              Currently assigned to <span className="font-medium text-zinc-700">{returnUser.name}</span>.
              Returning closes the open assignment record and frees the asset for reassignment.
            </p>
          )}
          <Textarea
            label={returnNotesRequired ? 'Handover Notes *' : 'Handover Notes'}
            rows={3}
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Condition, location, any observations…"
          />
        </div>
      </Modal>
    </div>
  )
}
