import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { CheckSquare, ChevronDown, ChevronUp, Download, Check, X } from 'lucide-react'
import { DataTablePagination } from '@/shared/ui/data-table-pagination'
import { DataTableEmpty } from '@/shared/ui/data-table-empty'
import { format, parseISO } from 'date-fns'
import { useTemplates, useAssignments } from '@/features/checklists'
import { useUsers } from '@/features/users'
import type { ChecklistAssignment } from '@/features/checklists/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { TableSkeleton } from '@/shared/ui/table-skeleton'

export function ResultsTab() {
  const { data: templates = [] } = useTemplates()
  const { data: assignments = [], isLoading } = useAssignments()
  const { data: users = [] } = useUsers()

  const templateMap = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const completed = useMemo(() => assignments.filter((a) => a.status === 'completed'), [assignments])

  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const columns = useMemo<ColumnDef<ChecklistAssignment>[]>(() => [
    { id: 'expand', header: '', cell: ({ row }) => (
      <button
        onClick={() => setExpanded((e) => ({ ...e, [row.original.id]: !e[row.original.id] }))}
        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
      >
        {expanded[row.original.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    )},
    { accessorKey: 'completedAt', header: 'Completed', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? <span className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">{format(parseISO(v), 'MMM dd, HH:mm')}</span> : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'templateId', header: 'Template', cell: ({ getValue }) => templateMap[getValue() as string]?.name ?? <span className="text-zinc-400">—</span> },
    { accessorKey: 'assignedTo', header: 'Assignee', cell: ({ getValue }) => {
      const user = userMap[getValue() as string]
      return user ? (
        <div className="flex items-center gap-2">
          <Avatar name={user.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{user.name}</span>
        </div>
      ) : <span className="text-zinc-400">—</span>
    }},
    { id: 'pass-rate', header: 'Items', cell: ({ row }) => {
      const passed = row.original.results.filter((r) => r.completed).length
      const total = row.original.results.length
      const failed = total - passed
      return (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700"><Check className="w-3.5 h-3.5" />{passed}</span>
          {failed > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-red-700"><X className="w-3.5 h-3.5" />{failed}</span>}
          <span className="text-[12px] text-zinc-400 tabular-nums">/{total}</span>
        </div>
      )
    }},
  ], [templateMap, userMap, expanded])

  const table = useReactTable({
    data: completed, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  })

  if (isLoading) return <TableSkeleton columns={5} rows={6} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search results...' }}
      >
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(completed, 'checklist-results', [
          { key: 'completedAt', label: 'Completed' },
          { key: 'templateId', label: 'Template' },
          { key: 'assignedTo', label: 'Assignee' },
          { key: 'completedBy', label: 'Completed By' },
        ])}>Export</Button>
      </ListToolbar>

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
                      <ResultDetail assignment={row.original} templateMap={templateMap} />
                    </td>
                  </tr>
                ),
              ].filter(Boolean))}
              {table.getRowModel().rows.length === 0 && (
                <DataTableEmpty colSpan={columns.length} icon={CheckSquare} message="No completed checklists yet" />
              )}
            </tbody>
          </table>
        </div>
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}

interface ResultDetailProps {
  assignment: ChecklistAssignment
  templateMap: Record<string, { items: { id: string; label: string; required: boolean }[] }>
}

function ResultDetail({ assignment, templateMap }: ResultDetailProps) {
  const tpl = templateMap[assignment.templateId]
  if (!tpl) return null

  const resultMap = Object.fromEntries(assignment.results.map((r) => [r.itemId, r]))

  return (
    <div className="bg-zinc-50/40 px-6 py-4 border-t border-zinc-100">
      <ul className="space-y-2">
        {tpl.items.map((item) => {
          const result = resultMap[item.id]
          const passed = result?.completed === true
          return (
            <li key={item.id} className="flex items-start gap-3 text-[13px]">
              {passed ? (
                <Check className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-zinc-700">{item.label} {item.required && <span className="text-red-500">*</span>}</p>
                {result?.notes && <p className="text-[12px] text-zinc-500 mt-0.5">{result.notes}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
