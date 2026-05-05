import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { LineChart, ChevronDown, ChevronUp, Download, Plus, Printer } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useQmsReports, useQmsTemplates } from '@/features/qms'
import { useUsers } from '@/features/users'
import type { QmsReport, ReportStatus } from '@/features/qms/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { StatusBadge } from '@/shared/ui/status-badge'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { MetricRow } from './metric-row'
import { PrintableReport } from './printable-report'

const reportSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  periodStart: z.string().min(1, 'Period start is required'),
  periodEnd: z.string().min(1, 'Period end is required'),
})

type ReportForm = z.infer<typeof reportSchema>

const statusFilters: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
]

export function ReportsTab() {
  const { data: reports = [], isLoading } = useQmsReports()
  const { data: templates = [] } = useQmsTemplates()
  const { data: users = [] } = useUsers()

  const templateMap = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showNew, setShowNew] = useState(false)
  const [printTarget, setPrintTarget] = useState<QmsReport | null>(null)

  const filtered = useMemo(
    () => statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter),
    [reports, statusFilter],
  )

  const passRate = (r: QmsReport) => {
    const all = r.sections.flatMap((s) => s.metrics)
    const passed = all.filter((m) => m.status === 'pass').length
    return all.length === 0 ? 0 : Math.round((passed / all.length) * 100)
  }

  const columns = useMemo<ColumnDef<QmsReport>[]>(() => [
    { id: 'expand', header: '', cell: ({ row }) => (
      <button
        onClick={() => setExpanded((e) => ({ ...e, [row.original.id]: !e[row.original.id] }))}
        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
      >
        {expanded[row.original.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    )},
    { accessorKey: 'id', header: 'Report', cell: ({ getValue }) => <span className="font-mono text-[12px] text-zinc-700">{getValue() as string}</span> },
    { accessorKey: 'templateId', header: 'Template', cell: ({ getValue }) => templateMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { id: 'period', header: 'Period', cell: ({ row }) => (
      <span className="text-zinc-700 whitespace-nowrap">{format(parseISO(row.original.periodStart), 'MMM dd')} → {format(parseISO(row.original.periodEnd), 'MMM dd, yyyy')}</span>
    )},
    { id: 'pass-rate', header: 'Pass Rate', cell: ({ row }) => {
      const r = row.original
      const all = r.sections.flatMap((s) => s.metrics)
      const passed = all.filter((m) => m.status === 'pass').length
      const failed = all.filter((m) => m.status === 'fail').length
      const rate = passRate(r)
      return (
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden flex-1 min-w-[60px]">
            <div className={rate >= 90 ? 'h-full bg-emerald-500' : rate >= 70 ? 'h-full bg-amber-500' : 'h-full bg-red-500'} style={{ width: `${rate}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-zinc-500 whitespace-nowrap">{passed}/{all.length}{failed > 0 && <span className="text-red-600 ml-1">({failed} fail)</span>}</span>
        </div>
      )
    }},
    { accessorKey: 'preparedBy', header: 'Prepared By', cell: ({ getValue }) => userMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <button
        onClick={() => setPrintTarget(row.original)}
        title="Print"
        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
      >
        <Printer className="w-4 h-4" />
      </button>
    )},
  ], [templateMap, userMap, expanded])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ReportForm>({ resolver: zodResolver(reportSchema) })

  const onSubmit = (_data: ReportForm) => {
    setShowNew(false)
    reset()
    toast.success('Report initialized — fill in metrics to publish')
  }

  if (isLoading) return <TableSkeleton columns={7} rows={4} />

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-1">
          <div className="max-w-sm flex-1">
            <SearchInput value={globalFilter} onChange={setGlobalFilter} placeholder="Search reports..." />
          </div>
          <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(reports, 'qms-reports', [
            { key: 'id', label: 'Report' },
            { key: 'templateId', label: 'Template' },
            { key: 'periodStart', label: 'Period Start' },
            { key: 'periodEnd', label: 'Period End' },
            { key: 'status', label: 'Status' },
            { key: 'preparedBy', label: 'Prepared By' },
            { key: 'preparedAt', label: 'Prepared At' },
          ])}>Export</Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowNew(true)}>New Report</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-zinc-50/50">{table.getHeaderGroups().map(hg => hg.headers.map(h => <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr></thead>
            <tbody>
              {table.getRowModel().rows.flatMap(row => [
                <tr key={row.id} className="border-b border-zinc-100/60 hover:bg-zinc-50/50">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3 text-sm text-zinc-600">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>,
                expanded[row.original.id] && (
                  <tr key={`${row.id}-detail`}>
                    <td colSpan={columns.length} className="p-0">
                      <div className="bg-zinc-50/40 px-6 py-5 border-t border-zinc-100 space-y-5">
                        {row.original.summary && <p className="text-[13px] text-zinc-700 italic">{row.original.summary}</p>}
                        {row.original.sections.map((s) => (
                          <div key={s.templateSectionId}>
                            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2">{s.title}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {s.metrics.map((m) => <MetricRow key={m.templateMetricId} metric={m} compact />)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ),
              ].filter(Boolean))}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={LineChart} message="No reports match your filters" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>

      <Modal open={!!printTarget} onClose={() => setPrintTarget(null)} title={printTarget ? `Print ${printTarget.id}` : 'Print'} size="lg">
        {printTarget && <PrintableReport report={printTarget} />}
      </Modal>

      <Modal open={showNew} onClose={() => { setShowNew(false); reset() }} title="New Report" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Template *" {...register('templateId')} error={errors.templateId?.message} placeholder="Select template" options={templates.map((t) => ({ value: t.id, label: t.name }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Period Start *" type="date" {...register('periodStart')} error={errors.periodStart?.message} />
            <Input label="Period End *" type="date" {...register('periodEnd')} error={errors.periodEnd?.message} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => { setShowNew(false); reset() }}>Cancel</Button>
            <Button type="submit" fullWidth>Initialize Report</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
