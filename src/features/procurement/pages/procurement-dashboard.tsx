import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  ArrowRight,
  Bell,
  ListChecks,
  Inbox,
  Building2,
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
import {
  format,
  formatDistanceToNow,
  parseISO,
  differenceInCalendarDays,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useRequests } from '@/features/procurement'
import { useSuppliers } from '@/features/suppliers'
import { useAuditLog } from '@/features/audit-log'
import { useNotifications } from '@/shared/notifications'
import { QualityStrip } from '@/shared/qms'
import { StatCard } from '@/shared/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { formatCompactCurrency, formatCurrency } from '@/shared/utils/format'
import type { RequestStatus, RequestWithItems } from '@/features/procurement'
import { cn } from '@/shared/utils/cn'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

const PROC_KINDS = new Set([
  'approval_needed',
  'request_approved',
  'request_rejected',
  'request_overdue',
])

export function ProcurementDashboard() {
  const { user } = useAuthStore()
  const { data: requests = [], isLoading } = useRequests()
  const { data: suppliers = [] } = useSuppliers()
  const { data: auditEntries = [] } = useAuditLog()
  const { notifications, unreadCount } = useNotifications()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter((r) => r.status === 'pending')
    const approved = requests.filter((r) => r.status === 'approved')
    const today = new Date()
    const overdue = pending.filter((r) => {
      if (!r.neededBy) return false
      return differenceInCalendarDays(parseISO(r.neededBy), today) < 0
    }).length
    const myApprovals = user
      ? pending.filter((r) => {
          const idx = r.currentApproverIndex ?? 0
          return r.approvers?.[idx] === user.id
        }).length
      : 0
    const monthSpend = approved
      .filter((r) => {
        if (!r.approvedAt) return false
        return parseISO(r.approvedAt) >= startOfMonth(today)
      })
      .reduce((s, r) => s + r.totalAmount, 0)
    const pendingValue = pending.reduce((s, r) => s + r.totalAmount, 0)
    return { total, pending: pending.length, approved: approved.length, overdue, myApprovals, monthSpend, pendingValue }
  }, [requests, user])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<RequestStatus, number>()
    for (const r of requests) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([status, value]) => ({ status, name: STATUS_LABEL[status], value }))
      .sort((a, b) => b.value - a.value)
  }, [requests])

  const monthlySpend = useMemo(() => {
    const now = new Date()
    const buckets: { month: string; key: string; spend: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i)
      buckets.push({ month: format(d, 'MMM'), key: format(d, 'yyyy-MM'), spend: 0 })
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]))
    for (const r of requests) {
      if (r.status !== 'approved' || !r.approvedAt) continue
      const k = format(parseISO(r.approvedAt), 'yyyy-MM')
      const bucket = byKey.get(k)
      if (bucket) bucket.spend += r.totalAmount
    }
    return buckets.map(({ month, spend }) => ({ month, spend }))
  }, [requests])

  const myApprovalQueue = useMemo(() => {
    if (!user) return []
    return requests
      .filter((r) => {
        if (r.status !== 'pending') return false
        const idx = r.currentApproverIndex ?? 0
        return r.approvers?.[idx] === user.id
      })
      .sort((a, b) => {
        const pa = a.priority === 'urgent' ? 0 : a.priority === 'normal' ? 1 : 2
        const pb = b.priority === 'urgent' ? 0 : b.priority === 'normal' ? 1 : 2
        if (pa !== pb) return pa - pb
        return b.createdAt.localeCompare(a.createdAt)
      })
      .slice(0, 5)
  }, [requests, user])

  const upcomingNeeded = useMemo(() => {
    const today = new Date()
    return requests
      .filter((r) => r.status === 'pending' && r.neededBy)
      .map((r) => ({
        req: r,
        days: differenceInCalendarDays(parseISO(r.neededBy as string), today),
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
  }, [requests])

  const recentActivity = useMemo(
    () => auditEntries.filter((e) => e.module === 'Procurement').slice(0, 5),
    [auditEntries],
  )

  const procAlerts = useMemo(
    () => notifications.filter((n) => PROC_KINDS.has(n.kind)).slice(0, 5),
    [notifications],
  )

  const topSuppliers = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of requests) {
      if (r.status !== 'approved' || !r.supplierId) continue
      totals.set(r.supplierId, (totals.get(r.supplierId) ?? 0) + r.totalAmount)
    }
    return Array.from(totals.entries())
      .map(([id, amount]) => ({
        id,
        name: suppliers.find((s) => s.id === id)?.name ?? id,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [requests, suppliers])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Procurement Dashboard</h1>
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
            Approvals, spend, and supplier activity in one place.
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
            to="approvals"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[13px] hover:bg-zinc-800 transition-colors"
          >
            <ListChecks className="w-4 h-4" />
            Approval Queue
            {stats.myApprovals > 0 && (
              <span className="px-1.5 py-0.5 bg-white/15 text-white text-[11px] font-medium rounded-full">{stats.myApprovals}</span>
            )}
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Requests"
          value={stats.pending}
          subtitle={stats.overdue > 0 ? `${stats.overdue} overdue` : 'All on track'}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={0}
        />
        <StatCard
          title="Approval Queue"
          value={stats.myApprovals}
          subtitle={stats.myApprovals > 0 ? 'Waiting on you' : 'Inbox clear'}
          icon={ListChecks}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          index={1}
        />
        <StatCard
          title="Approved Spend"
          value={formatCompactCurrency(stats.monthSpend)}
          subtitle="This month"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={2}
        />
        <StatCard
          title="Pending Value"
          value={formatCompactCurrency(stats.pendingValue)}
          subtitle="Across pending requests"
          icon={ShoppingCart}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          index={3}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Monthly Spend</CardTitle>
            <Link to="reports" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              Full report
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={monthlySpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Spend']} />
                  <Bar dataKey="spend" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No requests yet</div>
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
            <CardTitle>Approval Queue</CardTitle>
            <Link to="approvals" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {myApprovalQueue.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No requests waiting on you</p>
              </div>
            ) : (
              <ul>
                {myApprovalQueue.map((r: RequestWithItems, i) => (
                  <li
                    key={r.id}
                    className={cn(
                      'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                      i !== myApprovalQueue.length - 1 && 'border-b border-zinc-100/60',
                    )}
                    onClick={() => navigate(`requests?req=${r.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5">
                          {r.id}
                        </span>
                        {r.priority === 'urgent' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-medium border border-red-200">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-zinc-700 mt-1 truncate">
                        {r.notes ?? `${r.items.length} line${r.items.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <span className="text-[13px] font-medium text-zinc-900 tabular-nums whitespace-nowrap">
                      {formatCompactCurrency(r.totalAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Upcoming Need-By Dates</CardTitle>
            <Link to="requests" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingNeeded.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Clock className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No deadlines coming up</p>
              </div>
            ) : (
              <ul>
                {upcomingNeeded.map(({ req, days }, i) => {
                  const overdue = days < 0
                  const urgent = days <= 2
                  return (
                    <li
                      key={req.id}
                      className={cn(
                        'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                        i !== upcomingNeeded.length - 1 && 'border-b border-zinc-100/60',
                      )}
                      onClick={() => navigate(`requests?req=${req.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900">{req.id}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {overdue
                            ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
                            : days === 0
                            ? 'Today'
                            : days === 1
                            ? 'Tomorrow'
                            : format(parseISO(req.neededBy as string), 'MMM d')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-medium',
                          overdue
                            ? 'bg-red-50 text-red-700'
                            : urgent
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-zinc-100 text-zinc-600',
                        )}
                      >
                        {overdue ? 'Overdue' : urgent ? 'Urgent' : 'Upcoming'}
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
            <CardTitle>Top Suppliers (Approved)</CardTitle>
            <Link to="suppliers" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View suppliers
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {topSuppliers.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Building2 className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No approved spend yet</p>
              </div>
            ) : (
              <ul>
                {topSuppliers.map((s, i) => (
                  <li
                    key={s.id}
                    className={cn(
                      'px-6 py-3 flex items-center justify-between',
                      i !== topSuppliers.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <p className="text-[13px] font-medium text-zinc-900 truncate">{s.name}</p>
                    <span className="text-[13px] text-zinc-700 tabular-nums whitespace-nowrap">
                      {formatCompactCurrency(s.amount)}
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
        <QualityStrip module="procurement" />
      </motion.div>

      {procAlerts.length > 0 && (
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
                {procAlerts.map((n, i) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-6 py-3 flex items-start gap-3',
                      i !== procAlerts.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <n.icon className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{n.title}</p>
                      <p className="text-[12px] text-zinc-500 truncate">{n.description}</p>
                    </div>
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap mt-1.5">
                      {formatDistanceToNow(parseISO(n.timestamp), { addSuffix: true })}
                    </span>
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
