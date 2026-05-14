import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Fuel, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useFuelLogs, useVehicles, useCreateFuelLog } from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAuthStore } from '@/features/auth'
import type { FuelLog } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { formatCurrency } from '@/shared/utils/format'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { SearchableSelect } from '@/shared/ui/searchable-select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { Avatar } from '@/shared/ui/avatar'

const fuelSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  liters: z.number().min(0.1, 'Liters must be > 0'),
  costPerLiter: z.number().min(0),
  odometer: z.number().int().min(0),
  station: z.string().optional(),
  notes: z.string().optional(),
})

type FuelForm = z.infer<typeof fuelSchema>

export function FuelLogsTab() {
  const { data: logs = [], isLoading } = useFuelLogs()
  const { data: vehicles = [] } = useVehicles()
  const { data: drivers = [] } = useDrivers()
  const currentUser = useAuthStore((s) => s.user)
  const createFuelLog = useCreateFuelLog()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers])

  const [globalFilter, setGlobalFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const totals = useMemo(() => ({
    liters: logs.reduce((s, l) => s + l.liters, 0),
    cost: logs.reduce((s, l) => s + l.totalCost, 0),
    entries: logs.length,
  }), [logs])

  const columns = useMemo<ColumnDef<FuelLog>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => format(parseISO(getValue() as string), 'MMM dd, yyyy') },
    { accessorKey: 'vehicleId', header: 'Vehicle', cell: ({ getValue }) => {
      const v = vehicleMap[getValue() as string]
      return v ? <span className="font-mono text-[12px] text-zinc-700">{v.plateNumber}</span> : <span className="text-zinc-400">{getValue() as string}</span>
    }},
    { accessorKey: 'driverId', header: 'Driver', cell: ({ getValue }) => {
      const id = getValue() as string | undefined
      if (!id) return <span className="text-zinc-400">—</span>
      const driver = driverMap[id]
      if (!driver) return <span className="text-zinc-400">—</span>
      return (
        <div className="flex items-center gap-2">
          <Avatar name={driver.name} imageUrl={driver.photoUrl} size="sm" />
          <span className="text-[13px] text-zinc-700 truncate">{driver.name}</span>
        </div>
      )
    }},
    { accessorKey: 'liters', header: 'Liters', cell: ({ getValue }) => <span className="tabular-nums text-zinc-700">{(getValue() as number).toFixed(1)} L</span> },
    { accessorKey: 'costPerLiter', header: '₱/L', cell: ({ getValue }) => <span className="tabular-nums text-zinc-500">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'totalCost', header: 'Total', cell: ({ getValue }) => <span className="tabular-nums font-medium text-zinc-900">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'odometer', header: 'Odometer', cell: ({ getValue }) => <span className="tabular-nums text-zinc-500">{(getValue() as number).toLocaleString()} km</span> },
    { accessorKey: 'station', header: 'Station', cell: ({ getValue }) => (getValue() as string) ?? <span className="text-zinc-400">—</span> },
  ], [vehicleMap, driverMap])

  const table = useReactTable({
    data: logs, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset, watch, control } = useForm<FuelForm>({ resolver: zodResolver(fuelSchema) })

  const liters = watch('liters')
  const costPerLiter = watch('costPerLiter')
  const computedTotal = (Number(liters) || 0) * (Number(costPerLiter) || 0)

  const onSubmit = async (data: FuelForm) => {
    if (!currentUser) {
      toast.error('Sign in required')
      return
    }
    try {
      const log = await createFuelLog.mutateAsync({
        vehicleId: data.vehicleId,
        driverId: data.driverId || undefined,
        date: data.date,
        liters: data.liters,
        costPerLiter: data.costPerLiter,
        odometer: data.odometer,
        station: data.station || undefined,
        notes: data.notes || undefined,
        createdBy: currentUser.id,
      })
      toast.success(`Fuel log ${log.id} recorded`)
      setShowAdd(false)
      reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Log fuel failed')
    }
  }

  if (isLoading) return <TableSkeleton columns={8} rows={6} />

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-zinc-200/60 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Entries</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums">{totals.entries.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200/60 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Total Liters</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums">{totals.liters.toFixed(1)} L</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200/60 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Total Cost</p>
          <p className="text-lg font-semibold text-zinc-900 tabular-nums">{formatCurrency(totals.cost)}</p>
        </div>
      </div>

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search fuel logs...' }}
      >
        <ExportMenu
          rows={logs as unknown as Record<string, unknown>[]}
          baseFilename="fuel-logs"
          sheetName="Fuel Logs"
          pdfTitle="Fleet Fuel Logs"
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'vehicleId', label: 'Vehicle' },
            { key: 'driverId', label: 'Driver' },
            { key: 'liters', label: 'Liters' },
            { key: 'costPerLiter', label: '₱/L' },
            { key: 'totalCost', label: 'Total' },
            { key: 'odometer', label: 'Odometer' },
            { key: 'station', label: 'Station' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add Fuel Log</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Fuel}
        emptyMessage="No fuel logs found"
      />

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); reset() }}
        title="Log Fuel"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={createFuelLog.isPending} onClick={() => { setShowAdd(false); reset() }}>Cancel</Button>
            <Button type="submit" form="log-fuel-form" loading={createFuelLog.isPending}>Log Fuel</Button>
          </>
        }
      >
        <form id="log-fuel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
                  options={vehicles.filter((v) => v.fuelType !== 'electric').map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))}
                />
              )}
            />
            <Controller
              name="driverId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Driver"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.driverId?.message}
                  placeholder="Optional"
                  searchPlaceholder="Search drivers…"
                  options={drivers.filter((d) => d.status === 'active').map((d) => ({ value: d.id, label: d.name }))}
                />
              )}
            />
          </div>
          <Input label="Date *" type="date" {...register('date')} error={errors.date?.message} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Liters *" type="number" step="0.1" {...register('liters', { valueAsNumber: true })} error={errors.liters?.message} />
            <Input label="₱ / Liter *" type="number" step="0.01" {...register('costPerLiter', { valueAsNumber: true })} error={errors.costPerLiter?.message} />
            <Input label="Odometer *" type="number" {...register('odometer', { valueAsNumber: true })} error={errors.odometer?.message} helperText="km" />
          </div>
          <Input label="Station" {...register('station')} error={errors.station?.message} placeholder="e.g. Shell — Marine Pkwy" />
          <Textarea label="Notes" {...register('notes')} rows={2} />

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 border border-zinc-200/60">
            <span className="text-[13px] text-zinc-500">Computed total</span>
            <span className="text-base font-semibold tabular-nums text-zinc-900">{formatCurrency(computedTotal)}</span>
          </div>
        </form>
      </Modal>
    </div>
  )
}
