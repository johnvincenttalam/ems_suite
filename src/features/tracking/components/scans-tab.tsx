import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Activity, Download, MapPin, QrCode, Radio, Satellite } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useTags, useTrackingLogs } from '@/features/tracking'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import { useInventoryItems } from '@/features/inventory'
import { useUsers } from '@/features/users'
import type { TrackingLog, TrackingSource } from '@/features/tracking/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Avatar } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { EntityLabel } from './entity-label'
import { cn } from '@/shared/utils/cn'

const sourceFilters: { value: TrackingSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'gps', label: 'GPS' },
  { value: 'scan', label: 'Scans' },
]

export function ScansTab() {
  const { data: logs = [], isLoading } = useTrackingLogs()
  const { data: tags = [] } = useTags()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()
  const { data: items = [] } = useInventoryItems()
  const { data: users = [] } = useUsers()

  const tagMap = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags])
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  const [globalFilter, setGlobalFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<TrackingSource | 'all'>('all')

  const filtered = useMemo(
    () => sourceFilter === 'all' ? logs : logs.filter((l) => l.source === sourceFilter),
    [logs, sourceFilter],
  )

  const columns = useMemo<ColumnDef<TrackingLog>[]>(() => [
    { accessorKey: 'timestamp', header: 'Time', cell: ({ getValue }) => (
      <span className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">{format(parseISO(getValue() as string), 'MMM dd, HH:mm:ss')}</span>
    )},
    { accessorKey: 'source', header: 'Source', cell: ({ row }) => {
      const tag = tagMap[row.original.tagId]
      const Icon = tag?.type === 'gps' ? Satellite : tag?.type === 'qr' ? QrCode : Radio
      const source = row.original.source
      const className = source === 'gps'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : tag?.type === 'qr'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-violet-50 text-violet-700 border-violet-200'
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium uppercase', className)}>
          <Icon className="w-3 h-3" />
          {tag?.type ?? source}
        </span>
      )
    }},
    { id: 'entity', header: 'Entity', cell: ({ row }) => (
      <EntityLabel type={row.original.entityType} id={row.original.entityId} vehicleMap={vehicleMap} assetMap={assetMap} itemMap={itemMap} />
    )},
    { id: 'where', header: 'Where', cell: ({ row }) => {
      const l = row.original
      if (l.locationName) return <span className="text-zinc-700 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400" />{l.locationName}</span>
      if (l.latitude != null && l.longitude != null) return <span className="font-mono text-[12px] text-zinc-700">{l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}</span>
      return <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'scannedBy', header: 'By', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      if (!v) return <span className="text-zinc-400">—</span>
      const u = userMap[v]
      return u ? (
        <div className="flex items-center gap-2">
          <Avatar name={u.name} size="sm" />
          <span className="text-[13px] text-zinc-700">{u.name}</span>
        </div>
      ) : <span className="text-zinc-400">{v}</span>
    }},
    { accessorKey: 'tagId', header: 'Tag', cell: ({ getValue }) => {
      const tag = tagMap[getValue() as string]
      return tag ? <span className="font-mono text-[11px] text-zinc-400">{tag.code}</span> : <span className="text-zinc-400">—</span>
    }},
  ], [tagMap, vehicleMap, assetMap, itemMap, userMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  })

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search scans...' }}
        filter={<FilterChips options={sourceFilters} value={sourceFilter} onChange={setSourceFilter} />}
      >
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(logs, 'tracking-logs', [
          { key: 'timestamp', label: 'Timestamp' },
          { key: 'tagId', label: 'Tag' },
          { key: 'entityType', label: 'Entity Type' },
          { key: 'entityId', label: 'Entity Id' },
          { key: 'latitude', label: 'Latitude' },
          { key: 'longitude', label: 'Longitude' },
          { key: 'locationName', label: 'Location' },
          { key: 'source', label: 'Source' },
          { key: 'scannedBy', label: 'Scanned By' },
        ])}>Export</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={Activity}
        emptyMessage="No scans match your filters"
      />
    </div>
  )
}
