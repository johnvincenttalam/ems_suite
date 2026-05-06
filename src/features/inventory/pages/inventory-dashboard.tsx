import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Boxes,
  PackageX,
  Warehouse,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  AlertTriangle,
  Inbox,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { formatDistanceToNow, parseISO, subDays, isAfter } from 'date-fns'
import { useInventoryItems, useStockMovements } from '@/features/inventory'
import { useWarehouses } from '@/features/warehouses'
import { useCategories } from '@/features/categories'
import { useAuditLog } from '@/features/audit-log'
import { useNotifications } from '@/shared/notifications'
import { QualityStrip } from '@/shared/qms'
import { StatCard } from '@/shared/ui/stat-card'
import { DashboardGreeting } from '@/shared/ui/dashboard-greeting'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { formatCompactCurrency } from '@/shared/utils/format'
import type { StockMovementType } from '@/features/inventory'
import { cn } from '@/shared/utils/cn'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const MOVEMENT_COLORS: Record<StockMovementType, string> = {
  in: '#10b981',
  out: '#f59e0b',
  transfer: '#6366f1',
  adjustment: '#71717a',
}

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  in: 'Stock In',
  out: 'Stock Out',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

const INV_KINDS = new Set(['low_stock', 'stock_out'])

export function InventoryDashboard() {
  const { data: items = [], isLoading } = useInventoryItems()
  const { data: movements = [] } = useStockMovements()
  const { data: warehouses = [] } = useWarehouses()
  const { data: categories = [] } = useCategories()
  const { data: auditEntries = [] } = useAuditLog()
  const { notifications } = useNotifications()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const total = items.length
    const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.reorderLevel).length
    const stockOuts = items.filter((i) => i.quantity === 0).length
    const totalValue = items.reduce((s, i) => s + i.quantity * (i.unitCost ?? 0), 0)
    const today = new Date()
    const last30 = subDays(today, 30)
    const recent30Movements = movements.filter((m) => isAfter(parseISO(m.createdAt), last30)).length
    return { total, lowStock, stockOuts, totalValue, recent30Movements }
  }, [items, movements])

  const stockByWarehouse = useMemo(() => {
    const totals = new Map<string, { name: string; count: number; value: number }>()
    for (const w of warehouses) {
      totals.set(w.id, { name: w.name, count: 0, value: 0 })
    }
    for (const item of items) {
      const w = totals.get(item.warehouseId)
      if (!w) continue
      w.count += item.quantity
      w.value += item.quantity * (item.unitCost ?? 0)
    }
    return Array.from(totals.values())
      .filter((w) => w.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [items, warehouses])

  const stockByCategory = useMemo(() => {
    const totals = new Map<string, { name: string; value: number }>()
    for (const c of categories) {
      totals.set(c.id, { name: c.name, value: 0 })
    }
    for (const item of items) {
      const c = totals.get(item.categoryId)
      if (!c) continue
      c.value += item.quantity * (item.unitCost ?? 0)
    }
    return Array.from(totals.values())
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [items, categories])

  const lowStockTop = useMemo(() => {
    return items
      .filter((i) => i.quantity <= i.reorderLevel)
      .sort((a, b) => {
        const ra = a.reorderLevel === 0 ? 0 : a.quantity / a.reorderLevel
        const rb = b.reorderLevel === 0 ? 0 : b.quantity / b.reorderLevel
        return ra - rb
      })
      .slice(0, 6)
  }, [items])

  const movementBreakdown = useMemo(() => {
    const counts = new Map<StockMovementType, number>()
    for (const m of movements) counts.set(m.type, (counts.get(m.type) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([type, value]) => ({ type, name: MOVEMENT_LABEL[type], value }))
      .sort((a, b) => b.value - a.value)
  }, [movements])

  const recentMovements = useMemo(
    () =>
      [...movements]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [movements],
  )

  const recentActivity = useMemo(
    () => auditEntries.filter((e) => e.module === 'Inventory').slice(0, 5),
    [auditEntries],
  )

  const invAlerts = useMemo(
    () => notifications.filter((n) => INV_KINDS.has(n.kind)).slice(0, 5),
    [notifications],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Loading...</p>
        </div>
        <TableSkeleton columns={4} rows={3} />
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <DashboardGreeting
          subtitle="Stock health, movements, and warehouse activity at a glance."
          actions={
            <>
              <Link
                to="alerts"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <Bell className="w-4 h-4" />
                Alerts
                {invAlerts.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[11px] font-medium rounded-full">{invAlerts.length}</span>
                )}
              </Link>
              <Link
                to="movements"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[13px] hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Movements
              </Link>
            </>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Items"
          value={stats.total}
          subtitle={`Across ${warehouses.length} warehouse${warehouses.length === 1 ? '' : 's'}`}
          icon={Boxes}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={0}
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStock}
          subtitle={stats.lowStock > 0 ? 'At or below reorder' : 'All healthy'}
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={1}
        />
        <StatCard
          title="Stock-outs"
          value={stats.stockOuts}
          subtitle={stats.stockOuts > 0 ? 'Zero on hand' : 'Nothing depleted'}
          icon={PackageX}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          index={2}
        />
        <StatCard
          title="Inventory Value"
          value={formatCompactCurrency(stats.totalValue)}
          subtitle={`${stats.recent30Movements} movement${stats.recent30Movements === 1 ? '' : 's'} (30d)`}
          icon={TrendingUp}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          index={3}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Stock Value by Warehouse</CardTitle>
            <Link to="warehouses" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              Manage
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {stockByWarehouse.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No stock yet</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={stockByWarehouse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCompactCurrency(Number(v)), 'Value']} />
                    <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movements (All-time)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {movementBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No movements yet</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={movementBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {movementBreakdown.map((entry) => (
                        <Cell key={entry.type} fill={MOVEMENT_COLORS[entry.type]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Items Below Reorder</CardTitle>
            <Link to="items" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockTop.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Boxes className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">All items at healthy levels</p>
              </div>
            ) : (
              <ul>
                {lowStockTop.map((item, i) => {
                  const empty = item.quantity === 0
                  const w = warehouses.find((x) => x.id === item.warehouseId)
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                        i !== lowStockTop.length - 1 && 'border-b border-zinc-100/60',
                      )}
                      onClick={() => navigate(`items?item=${item.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          <span className="font-mono">{item.sku}</span>
                          {w && <> · {w.name}</>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-[13px] font-medium tabular-nums', empty ? 'text-red-700' : 'text-amber-700')}>
                          {item.quantity} <span className="text-zinc-400">/ {item.reorderLevel}</span>
                        </p>
                        <p className={cn('text-[11px] tabular-nums', empty ? 'text-red-600' : 'text-amber-600')}>
                          {empty ? 'Out of stock' : `${item.quantity - item.reorderLevel}`}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Recent Movements</CardTitle>
            <Link to="movements" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentMovements.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <ArrowLeftRight className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No movements yet</p>
              </div>
            ) : (
              <ul>
                {recentMovements.map((m, i) => {
                  const item = items.find((x) => x.id === m.itemId)
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        'px-6 py-3',
                        i !== recentMovements.length - 1 && 'border-b border-zinc-100/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-zinc-900 truncate">{item?.name ?? m.itemId}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            <span
                              className={cn(
                                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                                m.type === 'in'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : m.type === 'out'
                                  ? 'bg-amber-50 text-amber-700'
                                  : m.type === 'transfer'
                                  ? 'bg-violet-50 text-violet-700'
                                  : 'bg-zinc-100 text-zinc-700',
                              )}
                            >
                              {MOVEMENT_LABEL[m.type]}
                            </span>{' '}
                            <span className="ml-1 tabular-nums">{m.quantity}</span>
                          </p>
                        </div>
                        <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                          {formatDistanceToNow(parseISO(m.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Top Categories by Value</CardTitle>
            <Link to="categories" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              Manage
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stockByCategory.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Warehouse className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No categorized stock</p>
              </div>
            ) : (
              <ul>
                {stockByCategory.map((c, i) => (
                  <li
                    key={c.name}
                    className={cn(
                      'px-6 py-3 flex items-center justify-between',
                      i !== stockByCategory.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <p className="text-[13px] font-medium text-zinc-900 truncate">{c.name}</p>
                    <span className="text-[13px] text-zinc-700 tabular-nums whitespace-nowrap">
                      {formatCompactCurrency(c.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Recent Activity</CardTitle>
            <Link to="logs" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Inbox className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No activity yet</p>
              </div>
            ) : (
              <ul>
                {recentActivity.map((entry, i) => (
                  <li
                    key={entry.id}
                    className={cn(
                      'px-6 py-3',
                      i !== recentActivity.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-zinc-900">{entry.userName}</p>
                        <p className="text-[12px] text-zinc-600 truncate mt-0.5">{entry.detail}</p>
                      </div>
                      <span className="text-[11px] text-zinc-400 whitespace-nowrap mt-0.5">
                        {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <QualityStrip module="inventory" />
      </motion.div>

      {invAlerts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex-row items-center justify-between flex">
              <CardTitle>Open Alerts</CardTitle>
              <Link to="alerts" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
                See all alerts
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <ul>
                {invAlerts.map((n, i) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-6 py-3 flex items-start gap-3',
                      i !== invAlerts.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <n.icon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{n.title}</p>
                      <p className="text-[12px] text-zinc-500 truncate">{n.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
