import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { Route, Plus, MapPin, Loader2, ClipboardList } from 'lucide-react'
import { ChecklistPanel } from '@/shared/checklists'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { format, formatDistanceStrict, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTrips, useVehicles } from '@/features/fleet'
import { useUsers } from '@/features/users'
import type { Trip, TripStatus } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'

const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  startOdometer: z.number().int().min(0),
  purpose: z.string().optional(),
})

type TripForm = z.infer<typeof tripSchema>

const statusFilters: { value: TripStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function TripsTab() {
  const { data: trips = [], isLoading } = useTrips()
  const { data: vehicles = [] } = useVehicles()
  const { data: users = [] } = useUsers()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [inspectionTrip, setInspectionTrip] = useState<Trip | null>(null)

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
      const u = userMap[getValue() as string]
      return u ? (
        <div className="flex items-center gap-2">
          <Avatar name={u.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{u.name}</span>
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
      if (!vehicle?.checklistId) return null
      return (
        <button
          onClick={() => setInspectionTrip(trip)}
          title="Pre-trip inspection"
          className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
        ><ClipboardList className="w-4 h-4" /></button>
      )
    }},
  ], [vehicleMap, userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TripForm>({ resolver: zodResolver(tripSchema) })

  const onSubmit = (_data: TripForm) => {
    setShowNew(false)
    reset()
    toast.success('Trip started')
  }

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  const activeVehicles = vehicles.filter((v) => v.status === 'active')

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search trips..." />
          </div>
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Route} message="No trips match your filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

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
          return (
            <div className="pb-2">
              <p className="text-[12px] text-zinc-400 mb-4">
                {vehicle?.plateNumber ?? inspectionTrip.vehicleId}
                {' · '}
                {vehicle?.model}
                {' · driver '}
                {userMap[inspectionTrip.driverId]?.name ?? inspectionTrip.driverId}
              </p>
              <ChecklistPanel
                templateId={vehicle?.checklistId}
                assignedToUserId={inspectionTrip.driverId}
                readOnly={inspectionTrip.status === 'completed'}
              />
            </div>
          )
        })()}
      </Modal>

      <Modal open={showNew} onClose={() => { setShowNew(false); reset() }} title="Start Trip" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Vehicle *" {...register('vehicleId')} error={errors.vehicleId?.message} placeholder="Select vehicle" options={activeVehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))} />
          <Select label="Driver *" {...register('driverId')} error={errors.driverId?.message} placeholder="Select driver" options={users.filter((u) => u.status === 'active').map((u) => ({ value: u.id, label: u.name }))} />
          <Input label="Starting Odometer *" type="number" {...register('startOdometer', { valueAsNumber: true })} error={errors.startOdometer?.message} helperText="km" />
          <Textarea label="Purpose" {...register('purpose')} rows={2} placeholder="e.g. Site Alpha — supply run" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowNew(false); reset() }}>Cancel</Button>
            <Button type="submit" fullWidth>Start Trip</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
