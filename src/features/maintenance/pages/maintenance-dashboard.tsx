import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wrench,
  Clock,
  CheckCircle2,
  TriangleAlert,
  ArrowRight,
  Bell,
  Calendar,
  Inbox,
  Users,
  DollarSign,
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
  isAfter,
} from 'date-fns'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useWorkOrders, workOrderTotalCost } from '@/features/maintenance'
import { formatCurrency } from '@/shared/utils/format'
import { useUsers } from '@/features/users'
import { useAuditLog } from '@/features/audit-log'
import { useNotifications } from '@/shared/notifications'
import { QualityStrip } from '@/shared/qms'
import { StatCard } from '@/shared/ui/stat-card'
import { DashboardGreeting } from '@/shared/ui/dashboard-greeting'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus, WorkOrderType } from '@/features/maintenance'
import { cn } from '@/shared/utils/cn'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  pending: '#f59e0b',
  ongoing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
}

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  pending: 'Pending',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: '#a1a1aa',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
}

const PRIORITY_RANK: Record<WorkOrderPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const TYPE_LABEL: Record<WorkOrderType, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  inspection: 'Inspection',
}

const TYPE_COLORS: Record<WorkOrderType, string> = {
  preventive: '#10b981',
  corrective: '#f59e0b',
  inspection: '#8b5cf6',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

const MAINT_KINDS = new Set(['wo_assigned', 'wo_due_soon', 'wo_overdue'])

export function MaintenanceDashboard() {
  const { user } = useAuthStore()
  const { data: workOrders = [], isLoading } = useWorkOrders()
  const { data: users = [] } = useUsers()
  const { data: auditEntries = [] } = useAuditLog()
  const { notifications, unreadCount } = useNotifications()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const today = new Date()
    const open = workOrders.filter((w) => w.status !== 'completed')
    const overdue = open.filter((w) => differenceInCalendarDays(parseISO(w.scheduledDate), today) < 0).length
    const dueSoon = open.filter((w) => {
      const days = differenceInCalendarDays(parseISO(w.scheduledDate), today)
      return days >= 0 && days <= 2
    }).length
    const completedThisMonth = workOrders.filter((w) => {
      if (w.status !== 'completed' || !w.completedDate) return false
      return isAfter(parseISO(w.completedDate), startOfMonth(today))
    }).length
    const myOpen = user
      ? open.filter((w) => w.assignedTo === user.id).length
      : 0
    const costMTD = workOrders.reduce((sum, w) => {
      if (w.status !== 'completed' || !w.completedDate) return sum
      if (!isAfter(parseISO(w.completedDate), startOfMonth(today))) return sum
      return sum + workOrderTotalCost(w)
    }, 0)
    return { open: open.length, overdue, dueSoon, completedThisMonth, myOpen, costMTD }
  }, [workOrders, user])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<WorkOrderStatus, number>()
    for (const w of workOrders) counts.set(w.status, (counts.get(w.status) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([status, value]) => ({ status, name: STATUS_LABEL[status], value }))
      .sort((a, b) => b.value - a.value)
  }, [workOrders])

  const typeBreakdown = useMemo(() => {
    const counts = new Map<WorkOrderType, number>()
    for (const w of workOrders) counts.set(w.type, (counts.get(w.type) ?? 0) + 1)
    const order: WorkOrderType[] = ['preventive', 'corrective', 'inspection']
    return order
      .map((type) => ({ type, name: TYPE_LABEL[type], value: counts.get(type) ?? 0 }))
      .filter((t) => t.value > 0)
  }, [workOrders])

  const priorityBreakdown = useMemo(() => {
    const counts = new Map<WorkOrderPriority, number>()
    for (const w of workOrders.filter((x) => x.status !== 'completed')) {
      counts.set(w.priority, (counts.get(w.priority) ?? 0) + 1)
    }
    const order: WorkOrderPriority[] = ['critical', 'high', 'medium', 'low']
    return order
      .map((priority) => ({ priority, name: PRIORITY_LABEL[priority], value: counts.get(priority) ?? 0 }))
      .filter((p) => p.value > 0)
  }, [workOrders])

  const myQueue = useMemo(() => {
    if (!user) return []
    return workOrders
      .filter((w) => w.assignedTo === user.id && w.status !== 'completed')
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority]
        const pb = PRIORITY_RANK[b.priority]
        if (pa !== pb) return pa - pb
        return a.scheduledDate.localeCompare(b.scheduledDate)
      })
      .slice(0, 5)
  }, [workOrders, user])

  const upcoming = useMemo(() => {
    const today = new Date()
    return workOrders
      .filter((w) => w.status !== 'completed')
      .map((w) => ({
        wo: w,
        days: differenceInCalendarDays(parseISO(w.scheduledDate), today),
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
  }, [workOrders])

  const technicianLoad = useMemo(() => {
    const counts = new Map<string, number>()
    for (const w of workOrders.filter((x) => x.status !== 'completed')) {
      counts.set(w.assignedTo, (counts.get(w.assignedTo) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([userId, value]) => ({
        userId,
        name: users.find((u) => u.id === userId)?.name ?? userId,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [workOrders, users])

  const recentActivity = useMemo(
    () => auditEntries.filter((e) => e.module === 'Maintenance').slice(0, 5),
    [auditEntries],
  )

  const maintAlerts = useMemo(
    () => notifications.filter((n) => MAINT_KINDS.has(n.kind)).slice(0, 5),
    [notifications],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Maintenance Dashboard</h1>
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
          subtitle="Work orders, schedule, and technician load in one place."
          actions={
            <>
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
                to="work-orders"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[13px] hover:bg-zinc-800 transition-colors"
              >
                <Wrench className="w-4 h-4" />
                My Queue
                {stats.myOpen > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/15 text-white text-[11px] font-medium rounded-full">{stats.myOpen}</span>
                )}
              </Link>
            </>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Open Work Orders"
          value={stats.open}
          subtitle={stats.overdue > 0 ? `${stats.overdue} overdue` : 'All scheduled'}
          icon={Wrench}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          index={0}
        />
        <StatCard
          title="Due Soon"
          value={stats.dueSoon}
          subtitle="Within next 2 days"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={1}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          subtitle={stats.overdue > 0 ? 'Past scheduled date' : 'On track'}
          icon={TriangleAlert}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          index={2}
        />
        <StatCard
          title="Completed (MTD)"
          value={stats.completedThisMonth}
          subtitle="This month"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={3}
        />
        <StatCard
          title="Cost (MTD)"
          value={formatCurrency(stats.costMTD)}
          subtitle="Labor + parts"
          icon={DollarSign}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          index={4}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Open by Priority</CardTitle>
            <Link to="work-orders" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {priorityBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No open work orders</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={priorityBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {priorityBreakdown.map((entry) => (
                        <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Type</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {typeBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No work orders</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={typeBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {typeBreakdown.map((entry) => (
                        <Cell key={entry.type} fill={TYPE_COLORS[entry.type]} />
                      ))}
                    </Bar>
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
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No work orders</div>
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
            <CardTitle>My Work Queue</CardTitle>
            <Link to="work-orders" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {myQueue.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No open work assigned to you</p>
              </div>
            ) : (
              <ul>
                {myQueue.map((wo: WorkOrder, i) => (
                  <li
                    key={wo.id}
                    className={cn(
                      'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                      i !== myQueue.length - 1 && 'border-b border-zinc-100/60',
                    )}
                    onClick={() => navigate(`work-orders?wo=${wo.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5">
                          {wo.id}
                        </span>
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wide',
                            wo.priority === 'critical' && 'bg-red-50 text-red-700',
                            wo.priority === 'high' && 'bg-amber-50 text-amber-700',
                            wo.priority === 'medium' && 'bg-blue-50 text-blue-700',
                            wo.priority === 'low' && 'bg-zinc-100 text-zinc-600',
                          )}
                        >
                          {wo.priority}
                        </span>
                      </div>
                      <p className="text-[13px] text-zinc-900 mt-1 truncate">{wo.title}</p>
                    </div>
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                      {format(parseISO(wo.scheduledDate), 'MMM d')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Upcoming Schedule</CardTitle>
            <Link to="schedule" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              Open schedule
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Calendar className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">Nothing scheduled</p>
              </div>
            ) : (
              <ul>
                {upcoming.map(({ wo, days }, i) => {
                  const overdue = days < 0
                  const urgent = days <= 2
                  return (
                    <li
                      key={wo.id}
                      className={cn(
                        'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                        i !== upcoming.length - 1 && 'border-b border-zinc-100/60',
                      )}
                      onClick={() => navigate(`work-orders?wo=${wo.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{wo.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {overdue
                            ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
                            : days === 0
                            ? 'Today'
                            : days === 1
                            ? 'Tomorrow'
                            : format(parseISO(wo.scheduledDate), 'MMM d')}
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
            <CardTitle>Technician Load</CardTitle>
            <Link to="technicians" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {technicianLoad.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Users className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No active assignments</p>
              </div>
            ) : (
              <ul>
                {technicianLoad.map((t, i) => (
                  <li
                    key={t.userId}
                    className={cn(
                      'px-6 py-3 flex items-center justify-between',
                      i !== technicianLoad.length - 1 && 'border-b border-zinc-100/60',
                    )}
                  >
                    <p className="text-[13px] font-medium text-zinc-900 truncate">{t.name}</p>
                    <span className="text-[13px] text-zinc-700 tabular-nums">
                      {t.value} open
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
        <QualityStrip module="maintenance" />
      </motion.div>

      {maintAlerts.length > 0 && (
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
                {maintAlerts.map((n, i) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-6 py-3 flex items-start gap-3',
                      i !== maintAlerts.length - 1 && 'border-b border-zinc-100/60',
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
