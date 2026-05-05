import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  ArrowRight,
  Bell,
  GitBranch,
  Inbox,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import {
  format,
  formatDistanceToNow,
  parseISO,
  differenceInCalendarDays,
  isToday,
} from 'date-fns'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useDocuments } from '@/features/documents'
import { useAuditLog } from '@/features/audit-log'
import { useNotifications } from '@/shared/notifications'
import { QualityStrip } from '@/shared/qms'
import { StatCard } from '@/shared/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import { StatusBadge } from '@/shared/ui/status-badge'
import {
  CategoryBadge,
  PriorityBadge,
  TrackingBadge,
} from '@/features/documents/components/document-meta'
import type { AppDocument, DocumentStatus } from '@/features/documents'
import { cn } from '@/shared/utils/cn'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] as const } },
}

const STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: '#a1a1aa',
  in_review: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  archived: '#6366f1',
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
}

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

export function SdmsDashboard() {
  const { user } = useAuthStore()
  const { data: documents = [], isLoading } = useDocuments()
  const { data: auditEntries = [] } = useAuditLog()
  const { notifications, unreadCount } = useNotifications()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const total = documents.length
    const pending = documents.filter((d) => d.status === 'in_review').length
    const approvedToday = documents.filter((d) => {
      const lastSig = d.signatures[d.signatures.length - 1]
      if (d.status !== 'approved' || !lastSig) return false
      return isToday(parseISO(lastSig.signedAt))
    }).length
    const archived = documents.filter((d) => d.status === 'archived').length
    const inbox = documents.filter((d) => d.status === 'draft' && !d.category).length
    return { total, pending, approvedToday, archived, inbox }
  }, [documents])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<DocumentStatus, number>()
    for (const d of documents) counts.set(d.status, (counts.get(d.status) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([status, value]) => ({ status, name: STATUS_LABEL[status], value }))
      .sort((a, b) => b.value - a.value)
  }, [documents])

  const upcomingDeadlines = useMemo(() => {
    const today = new Date()
    return documents
      .filter((d) => d.deadline && d.status === 'in_review')
      .map((d) => ({
        doc: d,
        days: differenceInCalendarDays(parseISO(d.deadline as string), today),
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
  }, [documents])

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [documents],
  )

  const recentActivity = useMemo(
    () => auditEntries.filter((e) => e.module === 'Documents').slice(0, 5),
    [auditEntries],
  )

  const SDMS_KINDS = useMemo(
    () =>
      new Set([
        'sign_required',
        'routing_pending',
        'doc_approved',
        'doc_rejected',
        'deadline_soon',
        'deadline_overdue',
      ]),
    [],
  )

  const sdmsAlerts = useMemo(
    () => notifications.filter((n) => SDMS_KINDS.has(n.kind)).slice(0, 5),
    [notifications, SDMS_KINDS],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">SDMS Dashboard</h1>
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
            Monitor incoming files, approvals, archives, and team activity in one place.
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
            to="workflow"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 text-white text-[13px] hover:bg-zinc-800 transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            Review Queue
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={stats.total}
          subtitle={stats.inbox > 0 ? `${stats.inbox} in inbox` : 'All classified'}
          icon={FileText}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          index={0}
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          subtitle={stats.pending === 0 ? 'Smooth workflow' : 'Awaiting signatures'}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          index={1}
        />
        <StatCard
          title="Approved Today"
          value={stats.approvedToday}
          subtitle={stats.approvedToday > 0 ? 'Cleared today' : 'No approvals yet'}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          index={2}
        />
        <StatCard
          title="Archived"
          value={stats.archived}
          subtitle="Securely stored"
          icon={Archive}
          iconBg="bg-zinc-100"
          iconColor="text-zinc-600"
          index={3}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Documents by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div style={{ width: '100%', height: 240 }}>
              {statusBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[13px] text-zinc-400">No documents yet</div>
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

        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <Link to="calendar" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingDeadlines.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Clock className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No deadlines coming up</p>
              </div>
            ) : (
              <ul>
                {upcomingDeadlines.map(({ doc, days }, i) => {
                  const overdue = days < 0
                  const urgent = days <= 2
                  return (
                    <li
                      key={doc.id}
                      className={cn(
                        'px-6 py-3 flex items-center gap-3',
                        i !== upcomingDeadlines.length - 1 && 'border-b border-zinc-100/60',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`documents?doc=${doc.id}`)}
                        className="flex-1 min-w-0 text-left hover:text-zinc-900"
                      >
                        <p className="text-[13px] font-medium text-zinc-900 truncate">{doc.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Due: {overdue ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : format(parseISO(doc.deadline as string), 'MMM d')}
                        </p>
                      </button>
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
        <QualityStrip module="sdms" />
      </motion.div>

      {sdmsAlerts.length > 0 && (
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
                {sdmsAlerts.map((n, i) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-6 py-3 flex items-start gap-3',
                      i !== sdmsAlerts.length - 1 && 'border-b border-zinc-100/60',
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

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>Recent Documents</CardTitle>
            <Link to="documents" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentDocuments.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <FileText className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">No documents yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Tracking</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDocuments.map((doc: AppDocument) => (
                      <tr
                        key={doc.id}
                        className="border-t border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
                        onClick={() => navigate(`documents?doc=${doc.id}`)}
                      >
                        <td className="px-6 py-3">
                          <TrackingBadge trackingNumber={doc.trackingNumber} />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-zinc-900 max-w-xs truncate">{doc.title}</td>
                        <td className="px-4 py-3">
                          {doc.category ? <CategoryBadge value={doc.category} /> : <span className="text-[11px] text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {doc.priority ? <PriorityBadge value={doc.priority} /> : <span className="text-[11px] text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                        <td className="px-6 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                          {format(parseISO(doc.createdAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
