import { useMemo } from 'react'
import {
  Boxes,
  PackageX,
  AlertTriangle,
  TrendingUp,
  ArrowLeftRight,
  Warehouse as WarehouseIcon,
  Tag,
  CheckCircle2,
} from 'lucide-react'
import { subDays, parseISO, isAfter } from 'date-fns'
import { useInventoryItems, useStockMovements } from '@/features/inventory'
import { useWarehouses } from '@/features/warehouses'
import { useCategories } from '@/features/categories'
import type { StockMovementType, InventoryItem, StockMovement } from '@/features/inventory'
import { ExportMenu, StatCard, StatCardSkeleton } from '@/shared/ui/index'
import { PageHeader } from '@/shared/ui/page-header'
import type { ExportColumn } from '@/shared/utils/export-prep'
import { formatCompactCurrency } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'

interface BreakdownRow {
  key: string
  label: string
  count: number
  amount: number
  percent: number
}

function buildBreakdown<K extends string>(
  items: InventoryItem[],
  pick: (i: InventoryItem) => K | undefined,
  labelMap: Record<string, string>,
): BreakdownRow[] {
  const counts = new Map<K, { count: number; amount: number }>()
  let total = 0
  for (const i of items) {
    const k = pick(i)
    if (!k) continue
    const current = counts.get(k) ?? { count: 0, amount: 0 }
    counts.set(k, {
      count: current.count + 1,
      amount: current.amount + i.quantity * (i.unitCost ?? 0),
    })
    total += 1
  }
  return Array.from(counts.entries())
    .map(([k, { count, amount }]) => ({
      key: k,
      label: labelMap[k] ?? k,
      count,
      amount,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)
}

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  in: 'Stock In',
  out: 'Stock Out',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
}

export function InventoryReportsPage() {
  const { data: items = [], isLoading } = useInventoryItems()
  const { data: movements = [] } = useStockMovements()
  const { data: warehouses = [] } = useWarehouses()
  const { data: categories = [] } = useCategories()

  const stats = useMemo(() => {
    const total = items.length
    const stockOuts = items.filter((i) => i.quantity === 0).length
    const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel).length
    const totalValue = items.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
    const today = new Date()
    const last30 = subDays(today, 30)
    const recentMovements = movements.filter((m) => isAfter(parseISO(m.createdAt), last30)).length
    const inMovements = movements.filter((m) => m.type === 'in').length
    const outMovements = movements.filter((m) => m.type === 'out').length
    const turnoverHint = total === 0 ? 0 : Math.round((outMovements / total) * 100) / 100
    return { total, stockOuts, lowStock, totalValue, recentMovements, inMovements, outMovements, turnoverHint }
  }, [items, movements])

  const byWarehouse = useMemo(() => {
    const labelMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]))
    return buildBreakdown(items, (i) => i.warehouseId, labelMap)
  }, [items, warehouses])

  const byCategory = useMemo(() => {
    const labelMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))
    return buildBreakdown(items, (i) => i.categoryId, labelMap)
  }, [items, categories])

  const byMovementType = useMemo(() => {
    const counts = new Map<StockMovementType, number>()
    for (const m of movements) counts.set(m.type, (counts.get(m.type) ?? 0) + 1)
    const total = movements.length
    return Array.from(counts.entries())
      .map(([k, count]) => ({
        key: k,
        label: MOVEMENT_LABEL[k],
        count,
        amount: count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [movements])

  const slowMovers = useMemo(() => {
    const today = new Date()
    const last90 = subDays(today, 90)
    const movedItemIds = new Set(
      movements
        .filter((m) => isAfter(parseISO(m.createdAt), last90))
        .map((m) => m.itemId),
    )
    return items
      .filter((i) => !movedItemIds.has(i.id) && i.quantity > 0)
      .sort((a, b) => b.quantity * (b.unitCost ?? 0) - a.quantity * (a.unitCost ?? 0))
      .slice(0, 6)
  }, [items, movements])

  const exportRows = useMemo(
    () =>
      items.map((i) => ({
        sku: i.sku,
        name: i.name,
        category: categories.find((c) => c.id === i.categoryId)?.name ?? '',
        warehouse: warehouses.find((w) => w.id === i.warehouseId)?.name ?? '',
        quantity: i.quantity,
        reorderLevel: i.reorderLevel,
        unitCost: i.unitCost ?? '',
        totalValue: i.quantity * (i.unitCost ?? 0),
      })),
    [items, categories, warehouses],
  )

  const exportColumns: ExportColumn[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'reorderLevel', label: 'Reorder Level' },
    { key: 'unitCost', label: 'Unit Cost' },
    { key: 'totalValue', label: 'Total Value' },
  ]

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Stock value, movements, and slow-mover analysis" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Stock value, movements, and slow-mover analysis"
        actions={
          <ExportMenu
            rows={exportRows}
            baseFilename="inventory-report"
            sheetName="Inventory"
            pdfTitle="Inventory Report"
            pdfSubtitle={`${exportRows.length} item${exportRows.length === 1 ? '' : 's'}`}
            columns={exportColumns}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Items" value={stats.total} icon={Boxes} iconBg="bg-zinc-100" iconColor="text-zinc-600" index={0} />
        <StatCard title="Total Value" value={formatCompactCurrency(stats.totalValue)} subtitle="Active stock" icon={Tag} iconBg="bg-violet-50" iconColor="text-violet-600" index={1} />
        <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" index={2} />
        <StatCard title="Stock-outs" value={stats.stockOuts} icon={PackageX} iconBg="bg-red-50" iconColor="text-red-600" index={3} />
        <StatCard title="Movements (30d)" value={stats.recentMovements} subtitle={`${stats.inMovements} in · ${stats.outMovements} out`} icon={ArrowLeftRight} iconBg="bg-blue-50" iconColor="text-blue-600" index={4} />
        <StatCard title="Turnover Hint" value={stats.turnoverHint.toFixed(2)} subtitle="Outflows ÷ items" icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={5} />
        <StatCard title="Slow Movers" value={slowMovers.length} subtitle="No movement in 90d" icon={CheckCircle2} iconBg="bg-orange-50" iconColor="text-orange-600" index={6} />
        <StatCard title="Warehouses" value={warehouses.length} icon={WarehouseIcon} iconBg="bg-emerald-50" iconColor="text-emerald-600" index={7} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard title="By Warehouse" rows={byWarehouse} icon={WarehouseIcon} barColor="bg-emerald-500" valueAsCurrency />
        <BreakdownCard title="By Category" rows={byCategory} icon={Tag} barColor="bg-violet-500" valueAsCurrency />
        <BreakdownCard title="Movement Types" rows={byMovementType} icon={ArrowLeftRight} barColor="bg-blue-500" />
        <SlowMoversCard items={slowMovers} categories={categories} warehouses={warehouses} movements={movements} />
      </div>
    </div>
  )
}

function BreakdownCard({
  title,
  rows,
  icon: Icon,
  barColor,
  valueAsCurrency = false,
}: {
  title: string
  rows: BreakdownRow[]
  icon: typeof Boxes
  barColor: string
  valueAsCurrency?: boolean
}) {
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount))
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
          {rows.reduce((s, r) => s + r.count, 0)} total
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-zinc-700 truncate flex-1 mr-3">{r.label}</span>
                <span className="text-zinc-400 tabular-nums flex-shrink-0">
                  {r.count}
                  {valueAsCurrency && (
                    <>
                      {' '}
                      <span className="text-zinc-300">·</span> {formatCompactCurrency(r.amount)}
                    </>
                  )}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${(r.amount / maxAmount) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SlowMoversCard({
  items,
  categories,
  warehouses,
  movements,
}: {
  items: InventoryItem[]
  categories: { id: string; name: string }[]
  warehouses: { id: string; name: string }[]
  movements: StockMovement[]
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">Slow Movers (no movement in 90 days)</h3>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{items.length} flagged</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-zinc-400">No slow movers — every item has moved in the last 90 days.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const value = i.quantity * (i.unitCost ?? 0)
            const cat = categories.find((c) => c.id === i.categoryId)
            const wh = warehouses.find((w) => w.id === i.warehouseId)
            return (
              <li key={i.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100/60 last:border-0">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{i.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    <span className="font-mono">{i.sku}</span>
                    {cat && <> · {cat.name}</>}
                    {wh && <> · {wh.name}</>}
                  </p>
                </div>
                <span className="text-[12px] text-zinc-700 tabular-nums whitespace-nowrap">
                  {formatCompactCurrency(value)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {movements.length > 0 && items.length === 0 && (
        <p className="text-[11px] text-zinc-400 mt-3">Window: last 90 days · {movements.length} movement{movements.length === 1 ? '' : 's'} on file</p>
      )}
    </div>
  )
}
