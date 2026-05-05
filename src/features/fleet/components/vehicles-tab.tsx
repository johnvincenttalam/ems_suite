import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { Truck, Car, Zap, Fuel, Plus, MapPin, ClipboardList } from 'lucide-react'
import { TrackingPanel } from '@/shared/tracking'
import { ChecklistPanel } from '@/shared/checklists'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useVehicles } from '@/features/fleet'
import { useUsers } from '@/features/users'
import type { Vehicle, VehicleStatus, FuelType } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'

const vehicleSchema = z.object({
  plateNumber: z.string().min(2, 'Plate number is required'),
  model: z.string().min(2, 'Model is required'),
  year: z.number().int().min(1990).max(2100),
  fuelType: z.enum(['petrol', 'diesel', 'electric']),
  currentOdometer: z.number().int().min(0),
  fuelCapacityLiters: z.number().min(0).optional(),
  assignedDriverId: z.string().optional(),
})

type VehicleForm = z.infer<typeof vehicleSchema>

const statusFilters: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
]

const fuelIcon: Record<FuelType, typeof Fuel> = {
  petrol: Fuel,
  diesel: Fuel,
  electric: Zap,
}

export function VehiclesTab() {
  const { data: vehicles = [], isLoading } = useVehicles()
  const { data: users = [] } = useUsers()

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [locationVehicle, setLocationVehicle] = useState<Vehicle | null>(null)
  const [inspectionVehicle, setInspectionVehicle] = useState<Vehicle | null>(null)

  const filtered = useMemo(
    () => statusFilter === 'all' ? vehicles : vehicles.filter((v) => v.status === statusFilter),
    [vehicles, statusFilter],
  )

  const columns = useMemo<ColumnDef<Vehicle>[]>(() => [
    { accessorKey: 'plateNumber', header: 'Plate', cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
          {row.original.fuelType === 'electric' ? <Zap className="w-4 h-4 text-zinc-500" /> : <Car className="w-4 h-4 text-zinc-500" />}
        </div>
        <div>
          <p className="font-mono text-[13px] font-medium text-zinc-900">{row.original.plateNumber}</p>
          <p className="text-xs text-zinc-400">{row.original.model} · {row.original.year}</p>
        </div>
      </div>
    )},
    { accessorKey: 'fuelType', header: 'Fuel', cell: ({ getValue }) => {
      const v = getValue() as FuelType
      const Icon = fuelIcon[v]
      return <span className="inline-flex items-center gap-1.5 capitalize text-zinc-700"><Icon className="w-3.5 h-3.5 text-zinc-400" />{v}</span>
    }},
    { accessorKey: 'currentOdometer', header: 'Odometer', cell: ({ getValue }) => <span className="tabular-nums text-zinc-700">{(getValue() as number).toLocaleString()} km</span> },
    { accessorKey: 'assignedDriverId', header: 'Driver', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? (userMap[v]?.name ?? '—') : <span className="text-zinc-400">Unassigned</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'createdAt', header: 'Registered', cell: ({ getValue }) => format(parseISO(getValue() as string), 'MMM yyyy') },
    { id: 'actions', header: '', cell: ({ row }) => {
      const vehicle = row.original
      return (
        <div className="flex items-center gap-1">
          {vehicle.checklistId && (
            <button
              onClick={() => setInspectionVehicle(vehicle)}
              title="Pre-trip inspection"
              className="p-1.5 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            ><ClipboardList className="w-4 h-4" /></button>
          )}
          <button
            onClick={() => setLocationVehicle(vehicle)}
            title="View location"
            className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          ><MapPin className="w-4 h-4" /></button>
        </div>
      )
    }},
  ], [userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { fuelType: 'diesel', year: new Date().getFullYear(), currentOdometer: 0 },
  })

  const onSubmit = (_data: VehicleForm) => {
    setShowAdd(false)
    reset({ fuelType: 'diesel', year: new Date().getFullYear(), currentOdometer: 0 })
    toast.success('Vehicle registered')
  }

  if (isLoading) return <TableSkeleton columns={6} rows={5} />

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search vehicles..." />
          </div>
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="flex gap-2">
          <ExportMenu
            rows={vehicles as unknown as Record<string, unknown>[]}
            baseFilename="vehicles"
            sheetName="Vehicles"
            pdfTitle="Fleet Vehicles"
            columns={[
              { key: 'plateNumber', label: 'Plate' },
              { key: 'model', label: 'Model' },
              { key: 'year', label: 'Year' },
              { key: 'fuelType', label: 'Fuel' },
              { key: 'currentOdometer', label: 'Odometer' },
              { key: 'status', label: 'Status' },
              { key: 'assignedDriverId', label: 'Driver' },
            ]}
          />
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Register Vehicle</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={Truck} message="No vehicles match your filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal
        open={!!inspectionVehicle}
        onClose={() => setInspectionVehicle(null)}
        title={
          inspectionVehicle
            ? `Pre-trip Inspection · ${inspectionVehicle.plateNumber}`
            : 'Pre-trip Inspection'
        }
        size="lg"
      >
        {inspectionVehicle && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              {inspectionVehicle.model} · {inspectionVehicle.year}
            </p>
            <ChecklistPanel
              templateId={inspectionVehicle.checklistId}
              assignedToUserId={inspectionVehicle.assignedDriverId}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!locationVehicle}
        onClose={() => setLocationVehicle(null)}
        title={
          locationVehicle
            ? `Location · ${locationVehicle.plateNumber}`
            : 'Location'
        }
        size="lg"
      >
        {locationVehicle && (
          <div className="pb-2">
            <p className="text-[12px] text-zinc-400 mb-4">
              {locationVehicle.model} · {locationVehicle.year} · {locationVehicle.currentOdometer.toLocaleString()} km
            </p>
            <TrackingPanel entityType="vehicle" entityId={locationVehicle.id} />
          </div>
        )}
      </Modal>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset({ fuelType: 'diesel', year: new Date().getFullYear(), currentOdometer: 0 }) }} title="Register Vehicle" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Plate Number *" {...register('plateNumber')} error={errors.plateNumber?.message} placeholder="e.g. SGX 5482 K" />
            <Input label="Model *" {...register('model')} error={errors.model?.message} placeholder="e.g. Toyota Hilux" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Year *" type="number" {...register('year', { valueAsNumber: true })} error={errors.year?.message} />
            <Select label="Fuel Type *" {...register('fuelType')} error={errors.fuelType?.message} options={[
              { value: 'petrol', label: 'Petrol' },
              { value: 'diesel', label: 'Diesel' },
              { value: 'electric', label: 'Electric' },
            ]} />
            <Input label="Odometer *" type="number" {...register('currentOdometer', { valueAsNumber: true })} error={errors.currentOdometer?.message} helperText="km" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fuel Capacity (L)" type="number" {...register('fuelCapacityLiters', { valueAsNumber: true, setValueAs: (v) => v === '' || v == null || Number.isNaN(v) ? undefined : Number(v) })} error={errors.fuelCapacityLiters?.message} />
            <Select label="Assigned Driver" {...register('assignedDriverId')} error={errors.assignedDriverId?.message} placeholder="Optional" options={users.filter((u) => u.status === 'active').map((u) => ({ value: u.id, label: u.name }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowAdd(false); reset({ fuelType: 'diesel', year: new Date().getFullYear(), currentOdometer: 0 }) }}>Cancel</Button>
            <Button type="submit" fullWidth>Register Vehicle</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
