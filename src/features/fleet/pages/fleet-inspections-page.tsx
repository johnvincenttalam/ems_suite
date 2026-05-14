import { useCallback, useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { format, parseISO, startOfMonth, isAfter } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  useVehicleInspections,
  useVehicles,
  fleetApi,
} from '@/features/fleet'
import { useDrivers } from '@/features/drivers'
import { useAuthStore } from '@/features/auth'
import type { VehicleInspection, VehicleInspectionResult } from '@/features/fleet/types'
import { ExportMenu } from '@/shared/ui/export-menu'
import { PageHeader } from '@/shared/ui/page-header'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { SearchableSelect } from '@/shared/ui/searchable-select'
import { Modal } from '@/shared/ui/modal'
import { Textarea } from '@/shared/ui/textarea'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { StatCard } from '@/shared/ui/stat-card'
import { cn } from '@/shared/utils/cn'

type ResultFilter = VehicleInspectionResult | 'all'

const resultFilters: { value: ResultFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'attention', label: 'Attention' },
  { value: 'fail', label: 'Fail' },
]

const resultStyles: Record<VehicleInspectionResult, { Icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  pass:      { Icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Pass' },
  attention: { Icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   label: 'Attention' },
  fail:      { Icon: XCircle,       bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     label: 'Fail' },
}

const inspectionSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  inspectorDriverId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  result: z.enum(['pass', 'attention', 'fail']),
  itemsTotal: z.number().int().min(0).optional(),
  itemsPassed: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

type InspectionForm = z.infer<typeof inspectionSchema>

export function FleetInspectionsPage() {
  const { data: inspections = [], isLoading } = useVehicleInspections()
  const { data: vehicles = [] } = useVehicles()
  const { data: drivers = [] } = useDrivers()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers])

  const [globalFilter, setGlobalFilter] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(
    () => (resultFilter === 'all' ? inspections : inspections.filter((i) => i.result === resultFilter)),
    [inspections, resultFilter],
  )

  const stats = useMemo(() => {
    const today = new Date()
    const monthStart = startOfMonth(today)
    const thisMonth = inspections.filter((i) => isAfter(parseISO(i.date), monthStart))
    return {
      total: inspections.length,
      thisMonth: thisMonth.length,
      pass: inspections.filter((i) => i.result === 'pass').length,
      fail: inspections.filter((i) => i.result === 'fail').length,
      attention: inspections.filter((i) => i.result === 'attention').length,
    }
  }, [inspections])

  const createMutation = useMutation({
    mutationFn: fleetApi.createInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<InspectionForm>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      result: 'pass',
    },
  })

  const closeModal = useCallback(() => {
    setShowAdd(false)
    reset({ date: format(new Date(), 'yyyy-MM-dd'), result: 'pass' })
  }, [reset])

  const onSubmit = async (data: InspectionForm) => {
    if (!currentUser) {
      toast.error('Sign in required')
      return
    }
    try {
      const inspection = await createMutation.mutateAsync({
        vehicleId: data.vehicleId,
        inspectorDriverId: data.inspectorDriverId || undefined,
        date: data.date,
        result: data.result,
        itemsTotal: data.itemsTotal,
        itemsPassed: data.itemsPassed,
        notes: data.notes || undefined,
        createdBy: currentUser.id,
      })
      toast.success(`Inspection ${inspection.id} recorded`)
      closeModal()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Record inspection failed')
    }
  }

  const columns = useMemo<ColumnDef<VehicleInspection>[]>(() => [
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => (
      <span className="text-zinc-700 whitespace-nowrap">{format(parseISO(getValue() as string), 'MMM dd, yyyy')}</span>
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
    { accessorKey: 'inspectorDriverId', header: 'Inspector', cell: ({ getValue }) => {
      const id = getValue() as string | undefined
      if (!id) return <span className="text-zinc-400">—</span>
      const d = driverMap[id]
      return d ? (
        <div className="flex items-center gap-2">
          <Avatar name={d.name} size="sm" imageUrl={d.photoUrl} />
          <span className="text-[13px] text-zinc-700">{d.name}</span>
        </div>
      ) : <span className="text-zinc-400">{id}</span>
    }},
    { accessorKey: 'result', header: 'Result', cell: ({ row }) => {
      const cfg = resultStyles[row.original.result]
      const Icon = cfg.Icon
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium', cfg.bg, cfg.text)}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      )
    }},
    { id: 'items', header: 'Items', cell: ({ row }) => {
      const { itemsTotal, itemsPassed } = row.original
      if (itemsTotal == null) return <span className="text-zinc-400">—</span>
      const pct = itemsTotal > 0 && itemsPassed != null ? Math.round((itemsPassed / itemsTotal) * 100) : null
      return (
        <span className="text-[12.5px] text-zinc-600 tabular-nums">
          {itemsPassed ?? '—'}/{itemsTotal}
          {pct != null && <span className="text-zinc-400"> · {pct}%</span>}
        </span>
      )
    }},
    { accessorKey: 'tripId', header: 'Trip', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? <span className="font-mono text-[11px] text-zinc-500">{v}</span> : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'notes', header: 'Notes', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="text-zinc-400">—</span>
      return <span className="text-[12.5px] text-zinc-600 line-clamp-2">{v}</span>
    }},
  ], [vehicleMap, driverMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Vehicle Inspections" subtitle="Loading..." />
        <TableSkeleton columns={7} rows={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Vehicle Inspections"
        subtitle={`${stats.total} record${stats.total === 1 ? '' : 's'} · ${stats.thisMonth} this month`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard title="This Month" value={stats.thisMonth} icon={ClipboardCheck} iconBg="bg-blue-50" iconColor="text-blue-600" index={0} />
        <StatCard title="Pass" value={stats.pass} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={1} />
        <StatCard title="Attention" value={stats.attention} icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" index={2} />
        <StatCard title="Fail" value={stats.fail} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-600" index={3} />
      </div>

      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search inspections...' }}
        filter={<FilterChips options={resultFilters} value={resultFilter} onChange={setResultFilter} />}
      >
        <ExportMenu
          rows={inspections as unknown as Record<string, unknown>[]}
          baseFilename="vehicle-inspections"
          sheetName="Inspections"
          pdfTitle="Vehicle Inspections"
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'vehicleId', label: 'Vehicle' },
            { key: 'inspectorDriverId', label: 'Inspector' },
            { key: 'result', label: 'Result' },
            { key: 'itemsPassed', label: 'Items Passed' },
            { key: 'itemsTotal', label: 'Items Total' },
            { key: 'tripId', label: 'Trip' },
            { key: 'notes', label: 'Notes' },
          ]}
        />
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Record Inspection</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={ClipboardCheck}
        emptyMessage="No inspections match your filters"
      />

      <Modal
        open={showAdd}
        onClose={closeModal}
        title="Record Inspection"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={createMutation.isPending} onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="record-inspection-form" loading={createMutation.isPending}>Record</Button>
          </>
        }
      >
        <form id="record-inspection-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  options={vehicles
                    .filter((v) => v.status !== 'retired')
                    .map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))}
                />
              )}
            />
            <Input label="Date *" type="date" {...register('date')} error={errors.date?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="inspectorDriverId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Inspector"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="(optional)"
                  searchPlaceholder="Search inspectors…"
                  options={drivers
                    .filter((d) => d.status === 'active')
                    .map((d) => ({ value: d.id, label: d.name }))}
                />
              )}
            />
            <Select
              label="Result *"
              {...register('result')}
              error={errors.result?.message}
              options={[
                { value: 'pass', label: 'Pass' },
                { value: 'attention', label: 'Attention needed' },
                { value: 'fail', label: 'Fail' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Items Passed"
              type="number"
              {...register('itemsPassed', { setValueAs: (v) => v === '' || v == null ? undefined : Number(v) })}
            />
            <Input
              label="Items Total"
              type="number"
              {...register('itemsTotal', { setValueAs: (v) => v === '' || v == null ? undefined : Number(v) })}
            />
          </div>

          <Textarea label="Notes" rows={3} {...register('notes')} placeholder="What was inspected, what needs follow-up" />
        </form>
      </Modal>
    </div>
  )
}
