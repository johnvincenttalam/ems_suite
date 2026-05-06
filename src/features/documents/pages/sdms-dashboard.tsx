import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import {
  format,
  formatDistanceToNow,
  parseISO,
  differenceInCalendarDays,
  isThisMonth,
  subDays,
  isAfter,
  isToday,
} from 'date-fns'
import { useDocuments } from '@/features/documents/hooks/use-documents'
import { useSdmsTaskBuckets } from '@/features/documents/hooks/use-sdms-task-buckets'
import { useUsers } from '@/features/users'
import { StatCard } from '@/shared/ui/stat-card'
import { DashboardGreeting } from '@/shared/ui/dashboard-greeting'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/table-skeleton'
import {
  CategoryBadge,
  PriorityBadge,
} from '@/features/documents/components/document-meta'
import { DOCUMENT_STATUS_LABEL, type AppDocument, type DocumentStatus } from '@/features/documents/types'
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


const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  fontSize: '12px',
}

function isOverdue(doc: AppDocument): boolean {
  if (doc.status !== 'in_review' || !doc.deadline) return false
  return differenceInCalendarDays(parseISO(doc.deadline), new Date()) < 0
}

export function SdmsDashboard() {
  const { data: documents = [], isLoading } = useDocuments()
  const { data: users = [] } = useUsers()
  const navigate = useNavigate()

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  )

  const stats = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)

    const total = documents.length
    const pending = documents.filter((d) => d.status === 'in_review').length
    const overdue = documents.filter(isOverdue).length

    const createdLastWeek = documents.filter((d) =>
      isAfter(parseISO(d.createdAt), sevenDaysAgo),
    ).length

    const enteringReviewToday = documents.filter(
      (d) => d.status === 'in_review' && isToday(parseISO(d.createdAt)),
    ).length

    const approvedThisMonth = documents.filter((d) => {
      if (d.status !== 'approved') return false
      const lastSig = d.signatures[d.signatures.length - 1]
      return !!lastSig && isThisMonth(parseISO(lastSig.signedAt))
    }).length

    const approvedLastWeek = documents.filter((d) => {
      if (d.status !== 'approved') return false
      const lastSig = d.signatures[d.signatures.length - 1]
      return !!lastSig && isAfter(parseISO(lastSig.signedAt), sevenDaysAgo)
    }).length

    return {
      total,
      pending,
      approvedThisMonth,
      overdue,
      createdLastWeek,
      enteringReviewToday,
      approvedLastWeek,
    }
  }, [documents])

  const statusBreakdown = useMemo(() => {
    const counts = new Map<DocumentStatus, number>()
    for (const d of documents) counts.set(d.status, (counts.get(d.status) ?? 0) + 1)
    return (['draft', 'in_review', 'approved', 'archived', 'rejected'] as DocumentStatus[])
      .map((status) => ({ status, name: DOCUMENT_STATUS_LABEL[status], value: counts.get(status) ?? 0 }))
      .filter((s) => s.value > 0)
  }, [documents])

  const buckets = useSdmsTaskBuckets()
  const myTasks = useMemo(() => {
    // Order: pending (most urgent — you must sign), returned (your docs to revise),
    // review (others' docs routed to you for input). De-duped by id.
    const seen = new Set<string>()
    const out: AppDocument[] = []
    for (const d of [...buckets.pending, ...buckets.returned, ...buckets.review]) {
      if (!seen.has(d.id)) {
        seen.add(d.id)
        out.push(d)
      }
    }
    return out
  }, [buckets])

  const myTasksPreview = useMemo(() => myTasks.slice(0, 5), [myTasks])

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [documents],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
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
          subtitle="Documents in flight, approvals, and signing activity at a glance."
          actions={
            <Link
              to="create-document"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-fg text-[13px] font-medium hover:bg-accent-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Document
            </Link>
          }
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Documents"
            value={stats.total}
            subtitle={stats.createdLastWeek > 0 ? `+${stats.createdLastWeek} this week` : 'No new this week'}
            icon={FileText}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            index={0}
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pending}
            subtitle={stats.enteringReviewToday > 0 ? `+${stats.enteringReviewToday} today` : 'No new today'}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            index={1}
          />
          <StatCard
            title="Approved This Month"
            value={stats.approvedThisMonth}
            subtitle={stats.approvedLastWeek > 0 ? `+${stats.approvedLastWeek} this week` : 'None this week'}
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            index={2}
          />
          <StatCard
            title="Overdue"
            value={stats.overdue}
            subtitle={stats.overdue > 0 ? 'Requires attention' : 'On schedule'}
            icon={AlertCircle}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            index={3}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {statusBreakdown.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-[13px] text-zinc-400">
                No documents yet
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-lg font-semibold text-zinc-900 leading-none">{stats.total.toLocaleString()}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-1">Total</p>
                  </div>
                </div>
                <ul className="flex-1 space-y-1.5 min-w-0">
                  {statusBreakdown.map((entry) => (
                    <li key={entry.status} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: STATUS_COLORS[entry.status] }}
                        />
                        <span className="text-zinc-600 truncate">{entry.name}</span>
                      </span>
                      <span className="text-zinc-900 font-medium tabular-nums">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between flex">
            <CardTitle>My Tasks ({myTasks.length})</CardTitle>
            <Link to="my-tasks" className="text-[12px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1">
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {myTasksPreview.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-[13px] text-zinc-500">You&rsquo;re all caught up</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-6 py-3 text-left text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">Document</th>
                      <th className="px-3 py-3 text-left text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-3 text-left text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">From</th>
                      <th className="px-3 py-3 text-left text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">Due</th>
                      <th className="px-3 py-3 text-left text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-right text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTasksPreview.map((doc) => {
                      const author = userMap[doc.createdBy]
                      const days = doc.deadline ? differenceInCalendarDays(parseISO(doc.deadline), new Date()) : null
                      const overdue = days !== null && days < 0
                      return (
                        <tr
                          key={doc.id}
                          className="border-t border-zinc-100/60 hover:bg-zinc-50/50 cursor-pointer"
                          onClick={() => navigate(`documents/${doc.id}`)}
                        >
                          <td className="px-6 py-3">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-medium text-zinc-900 truncate">{doc.title}</span>
                              {doc.trackingNumber && (
                                <span className="text-[11px] text-zinc-400 font-mono">{doc.trackingNumber}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {doc.category ? <CategoryBadge value={doc.category} size="sm" /> : <span className="text-[11px] text-zinc-300">—</span>}
                          </td>
                          <td className="px-3 py-3 text-[12px] text-zinc-600 truncate max-w-[120px]">
                            {author?.name ?? '—'}
                          </td>
                          <td className="px-3 py-3 text-[12px] whitespace-nowrap">
                            {days === null ? (
                              <span className="text-zinc-300">—</span>
                            ) : (
                              <span className={cn(overdue ? 'text-red-600 font-medium' : 'text-zinc-600')}>
                                {overdue
                                  ? `${Math.abs(days)}d overdue`
                                  : days === 0
                                  ? 'Today'
                                  : days === 1
                                  ? 'Tomorrow'
                                  : format(parseISO(doc.deadline as string), 'MMM d')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {doc.priority ? <PriorityBadge value={doc.priority} size="sm" /> : <span className="text-[11px] text-zinc-300">—</span>}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`documents/${doc.id}`)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent text-accent-fg text-[12px] font-medium hover:bg-accent-hover transition-colors"
                            >
                              Review
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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
              <ul>
                {recentDocuments.map((doc, i) => (
                  <li
                    key={doc.id}
                    className={cn(
                      'px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50/50',
                      i !== recentDocuments.length - 1 && 'border-b border-zinc-100/60',
                    )}
                    onClick={() => navigate(`documents/${doc.id}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-900 truncate">{doc.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Updated {formatDistanceToNow(parseISO(doc.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 flex-shrink-0">v{doc.version}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
