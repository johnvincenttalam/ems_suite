import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Route, Plus, MapPin, Loader2, ClipboardList, AlertCircle, CheckSquare, Ban } from 'lucide-react'
import { ChecklistPanel } from '@/shared/checklists'
import { format, formatDistanceStrict, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTrips, useVehicles, useCreateTrip, useCompleteTrip, useCancelTrip } from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAuthStore } from '@/features/auth'
import { ReportIssueModal } from '@/features/issues'
import { ActionMenu, type ActionMenuItem } from '@/shared/ui/action-menu'
import type { Trip, TripStatus } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'

const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  startOdometer: z.number().int().min(0),
  purpose: z.string().optional(),
})

type TripForm = z.infer<typeof tripSchema>

const endTripSchema = z.object({
  endOdometer: z.number().int().min(0, 'Ending odometer is required'),
})

type EndTripForm = z.infer<typeof endTripSchema>

const statusFilters: { value: TripStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function TripsTab() {
  const { data: trips = [], isLoading } = useTrips()
  const { data: vehicles = [] } = useVehicles()
  const { data: drivers = [] } = useDrivers()
  const currentUser = useAuthStore((s) => s.user)
  const createTrip = useCreateTrip()
  const completeTrip = useCompleteTrip()
  const cancelTrip = useCancelTrip()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [inspectionTrip, setInspectionTrip] = useState<Trip | null>(null)
  const [reportIssueForTrip, setReportIssueForTrip] = useState<Trip | null>(null)
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null)
  const [cancellingTrip, setCancellingTrip] = useState<Trip | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const filtered = useMemo(
    () => statusFilter === 'all' ? trips : trips.filter((t) => t.status === statusFilter),
    [trips, statusFilter],
  )

  const columns = useMemo<ColumnDef<Trip>[]>(() => [
    { accessorKey: 'startTime', header: 'Started', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">{format(parseISO(getValue() as string), 'MMM dd, HH:mm')}</span>
    )},
    { accessorKey: 'vehicleId', header: 'Vehicle', cell: ({ getValue }) => {
      const v = vehicleMap[getValue() as string]
      return v ? (
        <div>
          <p className="font-mono text-[12px] font-medium text-zinc-900">{v.plateNumber}</p>
          <p className="text-[11px] text-zinc-400">{v.model}</p>
        </div>
      ) : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'driverId', header: 'Driver', cell: ({ getValue }) => {
      const d = driverMap[getValue() as string]
      return d ? (
        <div className="flex items-center gap-2">
          <Avatar name={d.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{d.name}</span>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { id: 'duration', header: 'Duration', cell: ({ row }) => {
      if (row.original.status === 'in_progress') {
        return <span className="inline-flex items-center gap-1 text-[12px] text-blue-700"><Loader2 className="w-3 h-3 animate-spin" />Running</span>
      }
      if (row.original.status === 'cancelled') {
        return <span className="inline-flex items-center gap-1 text-[12px] text-rose-700">Cancelled</span>
      }
      const dur = formatDistanceStrict(parseISO(row.original.endTime!), parseISO(row.original.startTime))
      return <span className="text-zinc-600 tabular-nums">{dur}</span>
    }},
    { accessorKey: 'distance', header: 'Distance', cell: ({ getValue, row }) => {
      const v = getValue() as number
      if (row.original.status !== 'completed') return <span className="text-zinc-400">—</span>
      return <span className="tabular-nums font-medium text-zinc-900">{v.toLocaleString()} km</span>
    }},
    { accessorKey: 'purpose', header: 'Purpose', cell: ({ getValue }) => {
      const v = (getValue() as string) ?? '—'
      return <span className="text-zinc-600 truncate inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />{v}</span>
    }},
    { id: 'actions', header: '', cell: ({ row }) => {
      const trip = row.original
      const vehicle = vehicleMap[trip.vehicleId]
      const items: ActionMenuItem[] = []
      if (trip.status === 'in_progress') {
        items.push({
          key: 'end',
          label: 'End trip',
          icon: CheckSquare,
          onClick: () => setCompletingTrip(trip),
        })
        items.push({
          key: 'cancel',
          label: 'Cancel trip',
          icon: Ban,
          danger: true,
          onClick: () => { setCancelReason(''); setCancellingTrip(trip) },
        })
      }
      return (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {vehicle?.checklistId && (
            <button
              onClick={() => setInspectionTrip(trip)}
              title="Pre-trip inspection"
              className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            ><ClipboardList className="w-4 h-4" /></button>
          )}
          {items.length > 0 && <ActionMenu items={items} />}
        </div>
      )
    }},
  ], [vehicleMap, driverMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TripForm>({ resolver: zodResolver(tripSchema) })

  const endTripForm = useForm<EndTripForm>({ resolver: zodResolver(endTripSchema) })

  const watchedEndOdo = endTripForm.watch('endOdometer')
  const previewDistance =
    completingTrip && Number.isFinite(watchedEndOdo) && (watchedEndOdo as number) >= completingTrip.startOdometer
      ? (watchedEndOdo as number) - completingTrip.startOdometer
      : null

  const onEndTrip = async (data: EndTripForm) => {
    if (!currentUser || !completingTrip) return
    try {
      await completeTrip.mutateAsync({
        id: completingTrip.id,
        endOdometer: data.endOdometer,
        completedBy: currentUser.id,
      })
      toast.success(`Trip ${completingTrip.id} completed`)
      setCompletingTrip(null)
      endTripForm.reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'End trip failed')
    }
  }

  const onCancelTrip = async () => {
    if (!currentUser || !cancellingTrip) return
    try {
      await cancelTrip.mutateAsync({
        id: cancellingTrip.id,
        byUserId: currentUser.id,
        reason: cancelReason.trim() || undefined,
      })
      toast.success(`Trip ${cancellingTrip.id} cancelled`)
      setCancellingTrip(null)
      setCancelReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel trip failed')
    }
  }

  const onSubmit = async (data: TripForm) => {
    if (!currentUser) {
      toast.error('Sign in required')
      return
    }
    try {
      const trip = await createTrip.mutateAsync({
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        startOdometer: data.startOdometer,
        purpose: data.purpose || undefined,
        createdBy: currentUser.id,
      })
      toast.success(`Trip ${trip.id} started`)
      setShowNew(false)
      reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Start trip failed')
    }
  }

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  const activeVehicles = vehicles.filter((v) => v.status === 'active')

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search trips...' }}
        filter={<FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />}
      >
        <ExportMenu
          rows={trips as unknown as Record<string, unknown>[]}
          baseFilename="trips"
          sheetName="Trips"
          pdfTitle="Fleet Trips"
          columns={[
            { key: 'id', label: 'Trip' },
            { key: 'vehicleId', label: 'Vehicle' },
            { key: 'driverId', label: 'Driver' },
            { key: 'startTime', label: 'Start' },
            { key: 'endTime', label: 'End' },
            { key: 'distance', label: 'Distance (km)' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'status', label: 'Status' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>Start Trip</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Route}
        emptyMessage="No trips match your filters"
      />

      <Modal
        open={!!inspectionTrip}
        onClose={() => setInspectionTrip(null)}
        title={
          inspectionTrip
            ? `Pre-trip Inspection · ${inspectionTrip.id}`
            : 'Pre-trip Inspection'
        }
        size="lg"
      >
        {inspectionTrip && (() => {
          const vehicle = vehicleMap[inspectionTrip.vehicleId]
          const driver = driverMap[inspectionTrip.driverId]
          return (
            <div className="pb-2">
              <p className="text-[12px] text-zinc-400 mb-4">
                {vehicle?.plateNumber ?? inspectionTrip.vehicleId}
                {' · '}
                {vehicle?.model}
                {' · driver '}
                {driver?.name ?? inspectionTrip.driverId}
              </p>
              <ChecklistPanel
                templateId={vehicle?.checklistId}
                assignedToUserId={driver?.userId}
                readOnly={inspectionTrip.status === 'completed'}
              />
              <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
                <p className="text-[11.5px] text-zinc-500">
                  Spotted something during inspection? File it as an issue so it doesn't get lost.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<AlertCircle className="w-3.5 h-3.5" />}
                  onClick={() => setReportIssueForTrip(inspectionTrip)}
                >
                  Report Issue
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      <ReportIssueModal
        open={!!reportIssueForTrip}
        onClose={() => setReportIssueForTrip(null)}
        target={reportIssueForTrip ? { kind: 'vehicle', id: reportIssueForTrip.vehicleId } : undefined}
      />

      <Modal
        open={showNew}
        onClose={() => { setShowNew(false); reset() }}
        title="Start Trip"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={createTrip.isPending} onClick={() => { setShowNew(false); reset() }}>Cancel</Button>
            <Button type="submit" form="start-trip-form" loading={createTrip.isPending}>Start Trip</Button>
          </>
        }
      >
        <form id="start-trip-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Vehicle *" {...register('vehicleId')} error={errors.vehicleId?.message} placeholder="Select vehicle" options={activeVehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))} />
          <Select label="Driver *" {...register('driverId')} error={errors.driverId?.message} placeholder="Select driver" options={drivers.filter((d) => d.status === 'active').map((d) => ({ value: d.id, label: d.name }))} />
          <Input label="Starting Odometer *" type="number" {...register('startOdometer', { valueAsNumber: true })} error={errors.startOdometer?.message} helperText="km" />
          <Textarea label="Purpose" {...register('purpose')} rows={2} placeholder="e.g. Site Alpha — supply run" />
        </form>
      </Modal>

      <Modal
        open={!!completingTrip}
        onClose={() => { setCompletingTrip(null); endTripForm.reset() }}
        title={completingTrip ? `End Trip · ${completingTrip.id}` : 'End Trip'}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={completeTrip.isPending} onClick={() => { setCompletingTrip(null); endTripForm.reset() }}>Cancel</Button>
            <Button type="submit" form="end-trip-form" loading={completeTrip.isPending}>End Trip</Button>
          </>
        }
      >
        {completingTrip && (
          <form id="end-trip-form" onSubmit={endTripForm.handleSubmit(onEndTrip)} className="space-y-4">
            <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/40 px-4 py-3 text-[12.5px] text-zinc-600">
              <p>
                <span className="font-mono text-zinc-700">{vehicleMap[completingTrip.vehicleId]?.plateNumber ?? completingTrip.vehicleId}</span>
                {' · '}
                {driverMap[completingTrip.driverId]?.name ?? completingTrip.driverId}
              </p>
              <p className="mt-1 text-zinc-500">
                Started at <strong className="text-zinc-700 tabular-nums">{completingTrip.startOdometer.toLocaleString()} km</strong>
                {' · '}
                {format(parseISO(completingTrip.startTime), 'MMM d, HH:mm')}
              </p>
            </div>
            <Input
              label="Ending Odometer *"
              type="number"
              {...endTripForm.register('endOdometer', { valueAsNumber: true })}
              error={endTripForm.formState.errors.endOdometer?.message}
              helperText={
                previewDistance != null
                  ? `Distance: ${previewDistance.toLocaleString()} km`
                  : 'Must be ≥ starting odometer'
              }
            />
          </form>
        )}
      </Modal>

      <Modal
        open={!!cancellingTrip}
        onClose={() => { setCancellingTrip(null); setCancelReason('') }}
        title={cancellingTrip ? `Cancel Trip · ${cancellingTrip.id}` : 'Cancel Trip'}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={cancelTrip.isPending} onClick={() => { setCancellingTrip(null); setCancelReason('') }}>Keep Trip</Button>
            <Button type="button" variant="danger" loading={cancelTrip.isPending} onClick={onCancelTrip}>Cancel Trip</Button>
          </>
        }
      >
        {cancellingTrip && (
          <div className="space-y-3">
            <p className="text-[13px] text-zinc-700">
              Cancel <span className="font-mono">{cancellingTrip.id}</span>? Distance will be set to 0
              and the trip will be marked cancelled.
            </p>
            <Textarea
              label="Reason (optional)"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Dispatcher cancelled, driver unavailable"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
