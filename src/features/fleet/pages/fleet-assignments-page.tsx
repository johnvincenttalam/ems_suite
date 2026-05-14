import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { UserCheck, Plus, Undo2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  useVehicleAssignments,
  useVehicles,
  useAssignVehicle,
  useReturnVehicle,
} from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAuthStore } from '@/features/auth'
import type { VehicleAssignment } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { PageHeader } from '@/shared/ui/page-header'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { SearchableSelect } from '@/shared/ui/searchable-select'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { VehicleThumbnail } from '@/features/fleet/components/vehicle-thumbnail'
import { differenceInCalendarDays } from 'date-fns'

type StatusFilter = 'all' | 'active' | 'returned'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'returned', label: 'Returned' },
]

const assignSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  notes: z.string().optional(),
})

type AssignForm = z.infer<typeof assignSchema>

export function FleetAssignmentsPage() {
  const { data: assignments = [], isLoading } = useVehicleAssignments()
  const { data: vehicles = [] } = useVehicles()
  const { data: drivers = [] } = useDrivers()
  const currentUser = useAuthStore((s) => s.user)
  const assignMutation = useAssignVehicle()
  const returnMutation = useReturnVehicle()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAssign, setShowAssign] = useState(false)
  const [returningVehicleId, setReturningVehicleId] = useState<string | null>(null)
  const [returnNotes, setReturnNotes] = useState('')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return assignments
    if (statusFilter === 'active') return assignments.filter((a) => !a.returnedDate)
    return assignments.filter((a) => !!a.returnedDate)
  }, [assignments, statusFilter])

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
  })

  const closeAssign = useCallback(() => {
    setShowAssign(false)
    reset()
  }, [reset])

  const onAssign = async (data: AssignForm) => {
    if (!currentUser) {
      toast.error('Sign in required')
      return
    }
    try {
      const { vehicle } = await assignMutation.mutateAsync({
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        notes: data.notes || undefined,
        assignedByUserId: currentUser.id,
      })
      toast.success(`${vehicle.plateNumber} assigned to ${driverMap[data.driverId]?.name ?? data.driverId}`)
      closeAssign()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assign failed')
    }
  }

  const onReturn = async () => {
    if (!currentUser || !returningVehicleId) return
    try {
      const vehicle = await returnMutation.mutateAsync({
        vehicleId: returningVehicleId,
        notes: returnNotes.trim() || undefined,
        returnedByUserId: currentUser.id,
      })
      toast.success(`${vehicle.plateNumber} returned`)
      setReturningVehicleId(null)
      setReturnNotes('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Return failed')
    }
  }

  // Vehicles available to be assigned: not retired, no current driver.
  const assignableVehicles = useMemo(
    () => vehicles.filter((v) => v.status !== 'retired' && !v.assignedDriverId),
    [vehicles],
  )

  const columns = useMemo<ColumnDef<VehicleAssignment>[]>(() => [
    { accessorKey: 'vehicleId', header: 'Vehicle', cell: ({ getValue }) => {
      const v = vehicleMap[getValue() as string]
      return v ? (
        <div className="flex items-center gap-2.5">
          <VehicleThumbnail size="sm" imageUrl={v.photoUrl} alt={v.model} />
          <div className="min-w-0">
            <p className="font-mono text-[12px] font-medium text-zinc-900">{v.plateNumber}</p>
            <p className="text-[11px] text-zinc-400 truncate">{v.model}</p>
          </div>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'driverId', header: 'Driver', cell: ({ getValue }) => {
      const d = driverMap[getValue() as string]
      return d ? (
        <div className="flex items-center gap-2">
          <Avatar name={d.name} size="sm" imageUrl={d.photoUrl} />
          <span className="text-[13px] text-zinc-700">{d.name}</span>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => (
      <span className="text-zinc-700 whitespace-nowrap">{format(parseISO(getValue() as string), 'MMM dd, yyyy')}</span>
    )},
    { id: 'duration', header: 'Duration', cell: ({ row }) => {
      const start = parseISO(row.original.assignedDate)
      const end = row.original.returnedDate ? parseISO(row.original.returnedDate) : new Date()
      const days = differenceInCalendarDays(end, start)
      return <span className="text-[12.5px] text-zinc-600 tabular-nums">{days.toLocaleString()} day{days === 1 ? '' : 's'}</span>
    }},
    { accessorKey: 'returnedDate', header: 'Returned', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">Active</span>
      return <span className="text-zinc-700 whitespace-nowrap">{format(parseISO(v), 'MMM dd, yyyy')}</span>
    }},
    { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="text-zinc-400">—</span>
      return <span className="text-[12.5px] text-zinc-600 line-clamp-2">{v}</span>
    }},
    { id: 'actions', header: '', cell: ({ row }) => {
      if (row.original.returnedDate) return null
      return (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Undo2 className="w-3.5 h-3.5" />}
            onClick={() => { setReturnNotes(''); setReturningVehicleId(row.original.vehicleId) }}
          >
            Return
          </Button>
        </div>
      )
    }},
  ], [vehicleMap, driverMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const activeCount = assignments.filter((a) => !a.returnedDate).length

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Vehicle Assignments" subtitle="Loading..." />
        <TableSkeleton columns={7} rows={6} />
      </div>
    )
  }

  const returningVehicle = returningVehicleId ? vehicleMap[returningVehicleId] : null
  const returningDriver = returningVehicle?.assignedDriverId ? driverMap[returningVehicle.assignedDriverId] : null

  return (
    <div>
      <PageHeader
        title="Vehicle Assignments"
        subtitle={`${assignments.length} record${assignments.length === 1 ? '' : 's'} · ${activeCount} active`}
      />

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search assignments...' }}
        filter={<FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={assignments as unknown as Record<string, unknown>[]}
          baseFilename="vehicle-assignments"
          sheetName="Assignments"
          pdfTitle="Vehicle Assignment History"
          columns={[
            { key: 'vehicleId', label: 'Vehicle' },
            { key: 'driverId', label: 'Driver' },
            { key: 'assignedDate', label: 'Assigned' },
            { key: 'returnedDate', label: 'Returned' },
            { key: 'notes', label: 'Notes' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAssign(true)}>Assign Vehicle</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={UserCheck}
        emptyMessage="No assignments match your filters"
      />

      <Modal
        open={showAssign}
        onClose={closeAssign}
        title="Assign Vehicle"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={assignMutation.isPending} onClick={closeAssign}>Cancel</Button>
            <Button type="submit" form="assign-vehicle-form" loading={assignMutation.isPending}>Assign</Button>
          </>
        }
      >
        <form id="assign-vehicle-form" onSubmit={handleSubmit(onAssign)} className="space-y-4">
          {assignableVehicles.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12.5px] text-amber-800">
              No vehicles available to assign — every active vehicle currently has a driver. Return one first.
            </div>
          )}
          <Controller
            name="vehicleId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Vehicle *"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.vehicleId?.message}
                placeholder="Select vehicle"
                searchPlaceholder="Search by plate or model…"
                options={assignableVehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))}
              />
            )}
          />
          <Controller
            name="driverId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Driver *"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.driverId?.message}
                placeholder="Select driver"
                searchPlaceholder="Search drivers…"
                options={drivers
                  .filter((d) => d.status === 'active')
                  .map((d) => ({ value: d.id, label: d.name }))}
              />
            )}
          />
          <Textarea label="Notes" rows={3} {...register('notes')} placeholder="e.g. Permanent assignment for Site Alpha runs" />
        </form>
      </Modal>

      <Modal
        open={!!returningVehicleId}
        onClose={() => { setReturningVehicleId(null); setReturnNotes('') }}
        title="Return Vehicle"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={returnMutation.isPending} onClick={() => { setReturningVehicleId(null); setReturnNotes('') }}>Cancel</Button>
            <Button type="button" loading={returnMutation.isPending} onClick={onReturn}>Confirm Return</Button>
          </>
        }
      >
        {returningVehicle && (
          <div className="space-y-4">
            <p className="text-[13px] text-zinc-600">
              Return <span className="font-mono text-zinc-900">{returningVehicle.plateNumber}</span>{' '}
              from <strong className="text-zinc-700">{returningDriver?.name ?? returningVehicle.assignedDriverId}</strong>?
              The open assignment will be closed today and the vehicle freed for re-assignment.
            </p>
            <Textarea
              label="Handover Notes"
              rows={3}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Condition, observations, anything the next driver should know"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
