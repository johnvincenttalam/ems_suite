import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Fuel, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useFuelLogs, useVehicles } from '@/features/fleet'
import { useUsers, isDriver } from '@/features/users'
import type { FuelLog } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { formatCurrency } from '@/shared/utils/format'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'

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
  const { data: users = [] } = useUsers()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

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
      const v = getValue() as string | undefined
      return v ? (userMap[v]?.name ?? '—') : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'liters', header: 'Liters', cell: ({ getValue }) => <span className="tabular-nums text-zinc-700">{(getValue() as number).toFixed(1)} L</span> },
    { accessorKey: 'costPerLiter', header: '₱/L', cell: ({ getValue }) => <span className="tabular-nums text-zinc-500">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'totalCost', header: 'Total', cell: ({ getValue }) => <span className="tabular-nums font-medium text-zinc-900">{formatCurrency(getValue() as number)}</span> },
    { accessorKey: 'odometer', header: 'Odometer', cell: ({ getValue }) => <span className="tabular-nums text-zinc-500">{(getValue() as number).toLocaleString()} km</span> },
    { accessorKey: 'station', header: 'Station', cell: ({ getValue }) => (getValue() as string) ?? <span className="text-zinc-400">—</span> },
  ], [vehicleMap, userMap])

  const table = useReactTable({
    data: logs, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FuelForm>({ resolver: zodResolver(fuelSchema) })

  const liters = watch('liters')
  const costPerLiter = watch('costPerLiter')
  const computedTotal = (Number(liters) || 0) * (Number(costPerLiter) || 0)

  const onSubmit = (_data: FuelForm) => {
    setShowAdd(false)
    reset()
    toast.success('Fuel log recorded')
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
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); reset() }}>Cancel</Button>
            <Button type="submit" form="log-fuel-form">Log Fuel</Button>
          </>
        }
      >
        <form id="log-fuel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Vehicle *" {...register('vehicleId')} error={errors.vehicleId?.message} placeholder="Select vehicle" options={vehicles.filter((v) => v.fuelType !== 'electric').map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))} />
            <Select label="Driver" {...register('driverId')} error={errors.driverId?.message} placeholder="Optional" options={users.filter(isDriver).map((u) => ({ value: u.id, label: u.name }))} />
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
