import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package,
  Wrench,
  UserCheck,
  ArrowRight,
  Bell,
  Inbox,
  Tag,
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
import { format, formatDistanceToNow, parseISO, differenceInCalendarDays } from 'date-fns'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useAssets, useAssetAssignments } from '@/features/assets'
import { useCategories } from '@/features/categories'
import { useAuditLog } from '@/features/audit-log'
import { useNotifications } from '@/shared/notifications'
import { useUsers } from '@/features/users'
import { StatCard } from '@/shared/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { formatCompactCurrency } from '@/shared/utils/format'
import type { Asset, AssetStatus } from '@/features/assets'
import { cn } from '@/shared/utils/cn'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const STATUS_COLORS: Record<AssetStatus, string> = {
  active: '#10b981',
  maintenance: '#f59e0b',
  disposed: '#71717a',
}

const STATUS_LABEL: Record<AssetStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  disposed: 'Disposed',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

const ASSET_KINDS = new Set(['asset_in_maintenance', 'asset_assignment_open'])

export function AssetsDashboard() {
  const { user } = useAuthStore()
  const { data: assets = [], isLoading } = useAssets()
  const { data: assignments = [] } = useAssetAssignments()
  const { data: categories = [] } = useCategories()
  const { data: users = [] } = useUsers()
  const { data: auditEntries = [] } = useAuditLog()
  const { notifications, unreadCount } = useNotifications()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const total = assets.length
    const active = assets.filter((a) => a.status === 'active').length
    const inMaintenance = assets.filter((a) => a.status === 'maintenance').length
    const disposed = assets.filter((a) => a.status === 'disposed').length
    const openAssignments = assignments.filter((a) => !a.returnedDate).length
    const totalValue = assets
      .filter((a) => a.status !== 'disposed')
      .reduce((s, a) => s + (a.purchaseCost ?? 0), 0)
    return { total, active, inMaintenance, disposed, openAssignments, totalValue }
  }, [assets, assignments])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<AssetStatus, number>()
    for (const a of assets) counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([status, value]) => ({ status, name: STATUS_LABEL[status], value }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  const byCategory = useMemo(() => {
    const totals = new Map<string, { name: string; count: number; value: number }>()
    for (const c of categories) {
      totals.set(c.id, { name: c.name, count: 0, value: 0 })
    }
    for (const a of assets) {
      const c = totals.get(a.categoryId)
      if (!c) continue
      c.count += 1
      c.value += a.purchaseCost ?? 0
    }
    return Array.from(totals.values())
      .filter((c) => c.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [assets, categories])

  const inMaintenance = useMemo(() => {
    return assets.filter((a) => a.status === 'maintenance').slice(0, 5)
  }, [assets])

  const openCheckouts = useMemo(() => {
    const today = new Date()
    return assignments
      .filter((a) => !a.returnedDate)
      .map((ass) => ({
        ass,
        days: differenceInCalendarDays(today, parseISO(ass.assignedDate)),
        asset: assets.find((a) => a.id === ass.assetId),
        user: users.find((u) => u.id === ass.assignedTo),
      }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5)
  }, [assignments, assets, users])

  const recentlyAdded = useMemo(
    () =>
      [...assets]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [assets],
  )

  const recentActivity = useMemo(
    () => auditEntries.filter((e) => e.module === 'Assets').slice(0, 5),
    [auditEntries],
  )

  const assetAlerts = useMemo(
    () => notifications.filter((n) => ASSET_KINDS.has(n.kind)).slice(0, 5),
    [notifications],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Assets Dashboard</h1>
          <p className="text-[13px] text-zinc-500 mt-1">Loading...</p>
        </div>
        <TableSkeleton columns={4} rows={3} />
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12px] text-zinc-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight mt-1">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Asset registry, assignments, and lifecycle health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="alerts"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Alerts
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[11px] font-medium rounded-full">{unreadCount}</span>
            )}
          </Link>
          <Link
            to="registry"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[13px] hover:bg-zinc-800 transition-colors"
          >
            <Package className="w-4 h-4" />
            Open Registry
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assets"
          value={stats.total}
          subtitle={`${stats.active} active`}
          icon={Package}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={0}
        />
        <StatCard
          title="In Maintenance"
          value={stats.inMaintenance}
          subtitle={stats.inMaintenance > 0 ? 'Currently down' : 'All operational'}
          icon={Wrench}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          index={1}
        />
        <StatCard
          title="Open Assignments"
          value={stats.openAssignments}
          subtitle="Currently checked out"
          icon={UserCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          index={2}
        />
        <StatCard
          title="Active Value"
          value={formatCompactCurrency(stats.totalValue)}
          subtitle={stats.disposed > 0 ? `${stats.disposed} disposed` : 'Excluding disposed'}
          icon={Tag}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          index={3}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Assets by Category</CardTitle>
            <Link to="categories" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              Manage
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {byCategory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No categorized assets</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {statusBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No assets</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
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
            <CardTitle>In Maintenance</CardTitle>
            <Link to="registry" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {inMaintenance.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Wrench className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">All assets operational</p>
              </div>
            ) : (
              <ul>
                {inMaintenance.map((a: Asset, i) => (
                  <li
                    key={a.id}
                    className={cn(
                      'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                      i !== inMaintenance.length - 1 && 'border-b border-zinc-100/60',
                    )}
                    onClick={() => navigate(`registry?asset=${a.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{a.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{a.serialNumber}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
                      Maintenance
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Long-running Checkouts</CardTitle>
            <Link to="assignments" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {openCheckouts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <UserCheck className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No open assignments</p>
              </div>
            ) : (
              <ul>
                {openCheckouts.map(({ ass, days, asset, user: assignee }, i) => {
                  const overdue = days >= 60
                  return (
                    <li
                      key={ass.id}
                      className={cn(
                        'px-6 py-3 flex items-center gap-3',
                        i !== openCheckouts.length - 1 && 'border-b border-zinc-100/60',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{asset?.name ?? ass.assetId}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {assignee?.name ?? ass.assignedTo}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums',
                          overdue ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-600',
                        )}
                      >
                        {days}d
                      </span>
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
            <CardTitle>Recently Added</CardTitle>
            <Link to="registry" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentlyAdded.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Package className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No assets yet</p>
              </div>
            ) : (
              <ul>
                {recentlyAdded.map((a, i) => (
                  <li
                    key={a.id}
                    className={cn(
                      'px-6 py-3 cursor-pointer hover:bg-zinc-50/50',
                      i !== recentlyAdded.length - 1 && 'border-b border-zinc-100/60',
                    )}
                    onClick={() => navigate(`registry?asset=${a.id}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{a.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{a.serialNumber}</p>
                      </div>
                      <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                        {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
                      </span>
                    </div>
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

      {assetAlerts.length > 0 && (
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
                {assetAlerts.map((n, i) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-6 py-3 flex items-start gap-3',
                      i !== assetAlerts.length - 1 && 'border-b border-zinc-100/60',
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
