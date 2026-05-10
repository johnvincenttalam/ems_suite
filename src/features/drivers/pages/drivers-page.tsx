import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IdCard, Plus, Trash2, Pencil, Phone, AlertTriangle } from 'lucide-react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'
import { useDrivers } from '@/features/drivers'
import { driversApi } from '@/features/drivers/api/drivers-api'
import { useDepartments } from '@/features/departments'
import { useAuthStore } from '@/features/auth'
import type { Driver, DriverStatus } from '@/features/drivers/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { PageHeader } from '@/shared/ui/page-header'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { StatusBadge } from '@/shared/ui/status-badge'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { Avatar } from '@/shared/ui/avatar'
import { CreateEditDriverModal } from '@/features/drivers/components/create-edit-driver-modal'
import { cn } from '@/shared/utils/cn'

type ModalMode = 'closed' | 'add' | 'edit'

const statusFilters: { value: DriverStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/** Days-until-expiry threshold for the warning pill on the License column. */
const LICENSE_WARNING_DAYS = 60

export function DriversPage() {
  const { data: drivers = [], isLoading } = useDrivers()
  const { data: departments = [] } = useDepartments()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const departmentMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments],
  )

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'all'>('all')
  const [modalMode, setModalMode] = useState<ModalMode>('closed')
  const [editing, setEditing] = useState<Driver | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Driver | null>(null)

  const filtered = useMemo(
    () => (statusFilter === 'all' ? drivers : drivers.filter((d) => d.status === statusFilter)),
    [drivers, statusFilter],
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] })
    queryClient.invalidateQueries({ queryKey: ['audit-log'] })
  }

  const removeMutation = useMutation({
    mutationFn: ({ id, deletedBy }: { id: string; deletedBy: string }) => driversApi.remove(id, deletedBy),
    onSuccess: invalidate,
  })

  const openAdd = () => { setEditing(null); setModalMode('add') }
  const openEdit = useCallback((d: Driver) => { setEditing(d); setModalMode('edit') }, [])
  const closeModal = () => { setModalMode('closed'); setEditing(null) }

  const confirmDelete = async () => {
    if (!deleteCandidate || !currentUser) return
    try {
      await removeMutation.mutateAsync({ id: deleteCandidate.id, deletedBy: currentUser.id })
      toast.success(`Deleted ${deleteCandidate.name}`)
      setDeleteCandidate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const today = useMemo(() => new Date(), [])

  const columns = useMemo<ColumnDef<Driver>[]>(() => [
    { accessorKey: 'name', header: 'Driver', cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={row.original.name} size="sm" />
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 truncate">{row.original.name}</p>
          {row.original.employeeId && (
            <p className="text-[11px] font-mono text-zinc-400">{row.original.employeeId}</p>
          )}
        </div>
      </div>
    )},
    { accessorKey: 'licenseNumber', header: 'License #', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span>
    )},
    { accessorKey: 'licenseClass', header: 'Class', cell: ({ getValue }) => (
      <span className="text-[12.5px] text-zinc-600">{getValue() as string}</span>
    )},
    { accessorKey: 'licenseExpiry', header: 'Expiry', cell: ({ getValue }) => {
      const expiry = getValue() as string
      const days = differenceInCalendarDays(parseISO(expiry), today)
      const expired = days < 0
      const expiringSoon = !expired && days <= LICENSE_WARNING_DAYS
      return (
        <div className="leading-tight">
          <p className={cn('text-[12.5px]', expired ? 'text-red-600 font-medium' : 'text-zinc-700')}>
            {format(parseISO(expiry), 'MMM dd, yyyy')}
          </p>
          {(expired || expiringSoon) && (
            <p className={cn('text-[11px] inline-flex items-center gap-1 mt-0.5',
              expired ? 'text-red-600' : 'text-amber-600',
            )}>
              <AlertTriangle className="w-3 h-3" />
              {expired ? `expired ${Math.abs(days)}d ago` : `expires in ${days}d`}
            </p>
          )}
        </div>
      )
    }},
    { accessorKey: 'departmentId', header: 'Department', cell: ({ getValue }) => {
      const id = getValue() as string | undefined
      if (!id) return <span className="text-zinc-400">—</span>
      return <span className="text-zinc-600">{departmentMap[id]?.name ?? id}</span>
    }},
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="text-zinc-400">—</span>
      return (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-600">
          <Phone className="w-3.5 h-3.5 text-zinc-400" />{v}
        </span>
      )
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const items: ActionMenuItem[] = [
          { key: 'edit', label: 'Edit driver', icon: Pencil, onClick: () => openEdit(row.original) },
          { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: () => setDeleteCandidate(row.original) },
        ]
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <ActionMenu items={items} />
          </div>
        )
      },
    },
  ], [departmentMap, openEdit, today])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) return (
    <div>
      <PageHeader title="Drivers" subtitle="Loading..." />
      <TableSkeleton columns={8} rows={6} />
    </div>
  )

  const active = drivers.filter((d) => d.status === 'active').length
  const expiringSoonCount = drivers.filter((d) => {
    const days = differenceInCalendarDays(parseISO(d.licenseExpiry), today)
    return days >= 0 && days <= LICENSE_WARNING_DAYS
  }).length

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={`${drivers.length} driver${drivers.length === 1 ? '' : 's'} · ${active} active${
          expiringSoonCount > 0 ? ` · ${expiringSoonCount} licence${expiringSoonCount === 1 ? '' : 's'} expiring soon` : ''
        }`}
      />

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search drivers...' }}
        filter={<FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={drivers as unknown as Record<string, unknown>[]}
          baseFilename="drivers"
          sheetName="Drivers"
          pdfTitle="Driver Roster"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'licenseNumber', label: 'License #' },
            { key: 'licenseClass', label: 'License Class' },
            { key: 'licenseExpiry', label: 'License Expiry' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'departmentId', label: 'Department' },
            { key: 'status', label: 'Status' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Driver</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={IdCard}
        emptyMessage="No drivers match your filters"
      />

      <CreateEditDriverModal
        open={modalMode !== 'closed'}
        onClose={closeModal}
        driver={editing}
        onSaved={() => { invalidate(); closeModal() }}
      />

      <Modal
        open={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Driver"
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
              <p className="text-[12.5px] text-zinc-500 mt-1 font-mono">{deleteCandidate.licenseNumber}</p>
              <p className="text-[12.5px] text-zinc-500 mt-2">
                This removes the driver from the roster but does not delete their trip history.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
