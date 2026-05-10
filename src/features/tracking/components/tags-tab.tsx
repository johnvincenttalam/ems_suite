import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, type ColumnDef } from '@tanstack/react-table'
import { Tag as TagIcon, Download, Plus, QrCode, Radio, Satellite } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useTags } from '@/features/tracking'
import { useVehicles } from '@/features/fleet'
import { useAssets } from '@/features/assets'
import { useInventoryItems } from '@/features/inventory'
import type { TagType, TrackingEntityType, TrackingTag } from '@/features/tracking/types'
import { exportToCSV } from '@/shared/utils/export-csv'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Modal } from '@/shared/ui/modal'
import { StatusBadge } from '@/shared/ui/status-badge'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { FilterChips } from '@/shared/ui/filter-chips'
import { ListToolbar } from '@/shared/ui/list-toolbar'
import { DataTable } from '@/shared/ui/data-table'
import { EntityLabel } from './entity-label'
import { cn } from '@/shared/utils/cn'

const tagSchema = z.object({
  code: z.string().min(2, 'Code is required'),
  type: z.enum(['rfid', 'qr', 'gps']),
  boundEntityType: z.enum(['asset', 'vehicle', 'item']),
  boundEntityId: z.string().min(1, 'Entity is required'),
})

type TagForm = z.infer<typeof tagSchema>

const typeFilters: { value: TagType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rfid', label: 'RFID' },
  { value: 'qr', label: 'QR' },
  { value: 'gps', label: 'GPS' },
]

const typeStyles: Record<TagType, { Icon: typeof Radio; className: string }> = {
  rfid: { Icon: Radio,      className: 'bg-violet-50 text-violet-700 border-violet-200' },
  qr:   { Icon: QrCode,     className: 'bg-blue-50 text-blue-700 border-blue-200' },
  gps:  { Icon: Satellite,  className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

interface TagsTabProps {
  /** When set, the page shows only tags bound to this entity type, and the
   * Add Tag modal locks Bind-To to this type. */
  entityFilter?: TrackingEntityType
}

export function TagsTab({ entityFilter }: TagsTabProps = {}) {
  const { data: tags = [], isLoading } = useTags()
  const { data: vehicles = [] } = useVehicles()
  const { data: assets = [] } = useAssets()
  const { data: items = [] } = useInventoryItems()

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles])
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])

  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<TagType | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    let result = tags
    if (entityFilter) result = result.filter((t) => t.boundEntityType === entityFilter)
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter)
    return result
  }, [tags, typeFilter, entityFilter])

  const columns = useMemo<ColumnDef<TrackingTag>[]>(() => [
    { accessorKey: 'code', header: 'Tag', cell: ({ row }) => {
      const cfg = typeStyles[row.original.type]
      const Icon = cfg.Icon
      return (
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0', cfg.className)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-mono text-[12px] text-zinc-700">{row.original.code}</span>
        </div>
      )
    }},
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => <span className="uppercase text-[11px] tracking-wider font-semibold text-zinc-500">{getValue() as string}</span> },
    { id: 'bound', header: 'Bound To', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">{row.original.boundEntityType}</span>
        <span className="text-zinc-300">·</span>
        <EntityLabel type={row.original.boundEntityType} id={row.original.boundEntityId} vehicleMap={vehicleMap} assetMap={assetMap} itemMap={itemMap} />
      </div>
    )},
    { accessorKey: 'lastSeenAt', header: 'Last Seen', cell: ({ getValue }) => {
      const v = getValue() as string | undefined
      return v ? <span className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">{format(parseISO(v), 'MMM dd, HH:mm')}</span> : <span className="text-zinc-400">—</span>
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'createdAt', header: 'Bound', cell: ({ getValue }) => format(parseISO(getValue() as string), 'MMM yyyy') },
  ], [vehicleMap, assetMap, itemMap])

  const table = useReactTable({
    data: filtered, columns, state: { globalFilter }, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
  })

  const defaultBoundType: TrackingEntityType = entityFilter ?? 'item'
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
    defaultValues: { type: 'qr', boundEntityType: defaultBoundType },
  })

  const watchedEntityType = watch('boundEntityType')
  const entityOptions = useMemo(() => {
    if (watchedEntityType === 'vehicle') return vehicles.map((v) => ({ value: v.id, label: `${v.plateNumber} — ${v.model}` }))
    if (watchedEntityType === 'asset') return assets.filter((a) => a.status !== 'disposed').map((a) => ({ value: a.id, label: `${a.name} (${a.serialNumber})` }))
    return items.map((i) => ({ value: i.id, label: `${i.sku} — ${i.name}` }))
  }, [watchedEntityType, vehicles, assets, items])

  const onSubmit = (_data: TagForm) => {
    setShowAdd(false)
    reset({ type: 'qr', boundEntityType: defaultBoundType })
    toast.success('Tag bound')
  }

  if (isLoading) return <TableSkeleton columns={6} rows={6} />

  return (
    <div>
      <ListToolbar
        search={{ value: globalFilter, onChange: setGlobalFilter, placeholder: 'Search tags...' }}
        filter={<FilterChips options={typeFilters} value={typeFilter} onChange={setTypeFilter} />}
      >
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => exportToCSV(tags, 'tracking-tags', [
          { key: 'code', label: 'Code' },
          { key: 'type', label: 'Type' },
          { key: 'boundEntityType', label: 'Entity Type' },
          { key: 'boundEntityId', label: 'Entity Id' },
          { key: 'status', label: 'Status' },
          { key: 'lastSeenAt', label: 'Last Seen' },
        ])}>Export</Button>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Bind Tag</Button>
      </ListToolbar>

      <DataTable
        table={table}
        columns={columns}
        emptyIcon={TagIcon}
        emptyMessage="No tags match your filters"
      />

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); reset({ type: 'qr', boundEntityType: defaultBoundType }) }}
        title="Bind Tag"
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); reset({ type: 'qr', boundEntityType: defaultBoundType }) }}>Cancel</Button>
            <Button type="submit" form="bind-tag-form">Bind Tag</Button>
          </>
        }
      >
        <form id="bind-tag-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Tag Code *" {...register('code')} error={errors.code?.message} placeholder="e.g. QR-INV-1234" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tag Type *" {...register('type')} error={errors.type?.message} options={[
              { value: 'rfid', label: 'RFID' },
              { value: 'qr', label: 'QR Code' },
              { value: 'gps', label: 'GPS' },
            ]} />
            <Select
              label="Bind To Type *"
              {...register('boundEntityType')}
              error={errors.boundEntityType?.message}
              disabled={!!entityFilter}
              options={[
                { value: 'item', label: 'Inventory Item' },
                { value: 'asset', label: 'Asset' },
                { value: 'vehicle', label: 'Vehicle' },
              ]}
            />
          </div>
          <Select label="Entity *" {...register('boundEntityId')} error={errors.boundEntityId?.message} placeholder="Select entity" options={entityOptions} />
        </form>
      </Modal>
    </div>
  )
}
