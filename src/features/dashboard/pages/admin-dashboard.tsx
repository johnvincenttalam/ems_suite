import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Boxes, Package, ShoppingCart, Wrench,
  TrendingUp, ArrowRight,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useReportsData } from '@/features/reports/hooks/use-reports-data'
import { useIssues } from '@/features/issues'
import { StatCard } from '@/shared/ui/stat-card'
import { DashboardGreeting } from '@/shared/ui/dashboard-greeting'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import { RecentActivityWidget } from '@/features/dashboard/components/recent-activity-widget'
import { DepartmentPerformanceWidget } from '@/features/dashboard/components/department-performance-widget'
import { QualityScorecard } from '@/shared/qms'
import { InsightsPanel, useInsights } from '@/shared/insights'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  maintenance: '#f59e0b',
  disposed: '#71717a',
  retired: '#71717a',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

export function AdminDashboard() {
  const data = useReportsData()
  const k = data.kpis
  const { data: issues = [] } = useIssues({ status: 'all-open' })
  const openCritical = issues.filter((i) => i.severity === 'critical').length
  const { insights, isLoading: insightsLoading } = useInsights()

  if (data.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Executive Overview</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Loading...</p>
        </div>
        <TableSkeleton columns={4} rows={3} />
      </div>
    )
  }

  const attentionItems = [
    { label: 'Critical issues open',   value: openCritical,        to: '/module/fleet/issues',  tone: openCritical > 0 ? 'danger' : 'ok' },
    { label: 'Overdue work orders',    value: k.overdueWorkOrders, to: '/module/maintenance',   tone: k.overdueWorkOrders > 0 ? 'danger' : 'ok' },
    { label: 'Items below reorder',    value: k.lowStockCount,     to: '/module/inventory',     tone: k.lowStockCount > 0 ? 'warn' : 'ok' },
    { label: 'Pending approvals',      value: k.pendingRequests,   to: '/module/procurement',   tone: k.pendingRequests > 0 ? 'warn' : 'ok' },
    { label: 'Documents in review',    value: k.docsInReview,      to: '/module/sdms',          tone: k.docsInReview > 0 ? 'warn' : 'ok' },
  ] as const

  const totalAttention = attentionItems.reduce((s, i) => s + (i.tone !== 'ok' ? i.value : 0), 0)
  const attentionModuleCount = attentionItems.filter((i) => i.tone !== 'ok').length

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants}>
        <DashboardGreeting subtitle="Executive overview across inventory, assets, procurement, and maintenance." />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Inventory Value"  value={formatCompactCurrency(k.inventoryValue)} subtitle={`${k.lowStockCount} item${k.lowStockCount === 1 ? '' : 's'} below reorder`} icon={Boxes}        iconBg="bg-blue-50"    iconColor="text-blue-600"    index={0} />
        <StatCard title="Active Assets"    value={k.activeAssets}                          subtitle={`${k.assetsInMaintenance} in maintenance`}                                        icon={Package}      iconBg="bg-emerald-50" iconColor="text-emerald-600" index={1} />
        <StatCard title="Approved Spend"   value={formatCompactCurrency(k.monthSpend)}     subtitle={`${k.pendingRequests} pending approval`}                                          icon={ShoppingCart} iconBg="bg-violet-50"  iconColor="text-violet-500"  index={2} />
        <StatCard title="Open Work Orders" value={k.overdueWorkOrders}                     subtitle={k.overdueWorkOrders > 0 ? 'Past scheduled date' : 'All on track'}                  icon={Wrench}       iconBg="bg-amber-50"   iconColor="text-amber-500"   index={3} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <InsightsPanel insights={insights} loading={insightsLoading} limit={6} />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <div>
              <CardTitle>Needs Attention</CardTitle>
              <p className="text-[12px] text-zinc-500 mt-1">
                {totalAttention === 0 ? 'Everything is on track.' : `${totalAttention} item${totalAttention === 1 ? '' : 's'} across ${attentionModuleCount} module${attentionModuleCount === 1 ? '' : 's'}.`}
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-6 pt-0">
            {attentionItems.map((item) => {
              const dotColor = item.tone === 'danger' ? 'bg-red-500' : item.tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-500'
              const valueColor = item.tone === 'danger' ? 'text-red-700' : item.tone === 'warn' ? 'text-amber-700' : 'text-zinc-900'
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-lg border border-zinc-200/60 px-4 py-3 hover:border-zinc-400 hover:shadow-sm transition flex items-start gap-3 group"
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor} ${item.tone !== 'ok' ? 'animate-pulse' : ''}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-zinc-500">{item.label}</p>
                    <p className={`text-2xl font-semibold tabular-nums mt-0.5 ${valueColor}`}>{item.value}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-700 transition-colors mt-2" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <QualityScorecard />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Monthly Procurement Spend</CardTitle>
            <Link to="/module/procurement/reports" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Full report
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={data.monthlySpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Spend']} />
                  <Bar dataKey="spend" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.assetStatusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {data.assetStatusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#a1a1aa'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Top Items Below Reorder</CardTitle>
            <Link to="/module/inventory" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.lowStockItems.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-[13px] text-zinc-500">No items below reorder level</p>
              </div>
            ) : (
              <ul>
                {data.lowStockItems.map((item) => {
                  const gap = item.quantity - item.reorderLevel
                  return (
                    <li key={item.id} className="px-6 py-3 flex items-center justify-between border-t border-zinc-100/60 first:border-t-0">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{item.name}</p>
                        <p className="text-[11px] font-mono text-zinc-400">{item.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-medium text-amber-700 tabular-nums">{item.quantity} / {item.reorderLevel}</p>
                        <p className="text-[11px] text-red-600 tabular-nums">{gap}</p>
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
            <CardTitle>Procurement Pipeline</CardTitle>
            <Link to="/module/procurement" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={data.procurementFunnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityWidget />
        <DepartmentPerformanceWidget />
      </motion.div>

    </motion.div>
  )
}
